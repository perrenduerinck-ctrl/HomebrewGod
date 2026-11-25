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


async function savedJourneyCharacters(page,roomCode) {
  return page.evaluate(async({base,roomCode})=>{const {getFirestore,collection,getDocs}=await import(base+'firebase-firestore.js');return (await getDocs(collection(getFirestore(),'rooms',roomCode,'characters'))).docs.map(doc=>({id:doc.id,...doc.data()}));},{base:firebase,roomCode});
}
async function openJourneySheet(page,id) {
  await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen('characterCreator'));
  const library=page.locator('[data-cc-action="library"]').first();if(await library.isVisible())await library.click();
  await page.locator('[data-cc-action="open-character-sheet-from-library"][data-character-id="'+id+'"]').click();
  await expect(page.locator('.hg-character-sheet-header')).toBeVisible();
}

const SPELLCASTER_JOURNEYS = [
  {name:'Sorcerer 3 / Warlock 3',classes:[['sorcerer',3],['warlock',3]],caster:'warlock',spellId:'expeditious-retreat',spellName:'Expeditious Retreat',mode:'known',pact:true,secondSlots:2},
  {name:'Bard 3 / Cleric 3',classes:[['bard',3],['cleric',3]],caster:'cleric',spellId:'detect-magic',spellName:'Detect Magic',mode:'prepared',secondSlots:3},
  {name:'Bard 10 / Cleric 10',classes:[['bard',10],['cleric',10]],caster:'cleric',spellId:'detect-magic',spellName:'Detect Magic',mode:'prepared',secondSlots:3},
  {name:'Paladin 19 / Druid 1',classes:[['paladin',19],['druid',1]],caster:'druid',spellId:'detect-magic',upcast:5,spellName:'Detect Magic',mode:'prepared',secondSlots:3},
  {name:'Wizard 3 / Cleric 1',classes:[['wizard',3],['cleric',1]],caster:'wizard',spellId:'detect-magic',spellName:'Detect Magic',mode:'book',secondSlots:3},
  {name:'Druid 3 / Cleric 1',classes:[['druid',3],['cleric',1]],caster:'druid',spellId:'detect-magic',spellName:'Detect Magic',mode:'prepared',secondSlots:3},
  {name:'Ranger 3 / Druid 3',classes:[['ranger',3],['druid',3]],caster:'ranger',concentrationSpellId:'guidance',spellId:'speak-with-animals',spellName:'Speak with Animals',mode:'known',secondSlots:3,thirdSlots:0,upcast:2},
  {name:'Artificer 3 / Wizard 1',classes:[['artificer',3],['wizard',1]],caster:'artificer',spellId:'detect-magic',spellName:'Detect Magic',mode:'prepared',secondSlots:2,thirdSlots:0},
  {name:'Sorcerer 3',classes:[['sorcerer',3]],caster:'sorcerer',spellId:'expeditious-retreat',spellName:'Expeditious Retreat',mode:'known',secondSlots:2}
];
for (const journey of SPELLCASTER_JOURNEYS) test('spellcaster journey: '+journey.name+' creation, casting, reopening and rests',async({page})=>{
  test.setTimeout(180000);page.setDefaultTimeout(15000);page.on('dialog',dialog=>dialog.accept());
  await page.route('https://example.test/journey-map.svg',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#334455"/></svg>'}));
  const uid=await signIn(page,'Journey Tester');await page.locator('#roomNameInput').fill('Spellcaster journey');await page.locator('#createRoomButton').click();
  await expect(page.locator('#roomCodeText')).toHaveText(/^[A-Z0-9]+-[A-Z0-9]+$/);const roomCode=(await page.locator('#roomCodeText').textContent()).trim();
  await page.evaluate(async({base,roomCode})=>{const {getFirestore,doc,updateDoc}=await import(base+'firebase-firestore.js');await updateDoc(doc(getFirestore(),'rooms',roomCode),{currentMap:{id:'journey-map',name:'Journey map',url:'https://example.test/journey-map.svg'}});},{base:firebase,roomCode});
  await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen('characterCreator'));
  const name='Journey '+journey.name;
  await page.locator('[data-cc-action="new-character"]').first().click();await page.locator('#ccCharacterName').fill(name);
  await page.locator('.hg-character-step-button[data-step-id="class"]').click();await page.locator('#ccClassBuildTotalLevel').fill(String(journey.classes.reduce((sum,[,level])=>sum+level,0)));await page.locator('#ccClassBuildTotalLevel').blur();
  if(journey.classes.length>1)await page.locator('[data-build-mode="multiclass"]').click();
  for(const [id] of journey.classes)await page.locator('[data-cc-action="toggle-class-build-class"][data-class-id="'+id+'"]').click();
  if(journey.classes.length>1)for(let i=1;i<journey.classes[1][1];i++)await page.locator('[data-cc-action="adjust-class-build-level"][data-class-id="'+journey.classes[1][0]+'"][data-level-delta="1"]').click();
  await page.locator('[data-cc-action="confirm-class-build"]').click();
  await page.locator('.hg-character-step-button[data-step-id="abilities"]').click();await page.locator('#ccAbilityMethod').selectOption('manual');
  for(const [ability,score] of [['int',18],['wis',16],['cha',14]]){await page.locator('#ccAbility-'+ability).fill(String(score));await page.locator('#ccAbility-'+ability).blur();}
  await page.locator('.hg-character-step-button[data-step-id="spells"]').click();await page.locator('#ccDefaultSpellSearch').fill(journey.spellName);
  const card=page.locator('article[data-spell-id="'+journey.spellId+'"]');await expect(card).toBeVisible();const source=card.locator('[data-cc-spell-source-select]');
  if(await source.count()){const value=await source.locator('option').evaluateAll((options,caster)=>options.find(option=>option.textContent.toLowerCase().startsWith(caster+' '))?.value,journey.caster);expect(value).toBeTruthy();await source.selectOption(value);}
  if(journey.mode!=='prepared')await card.locator('[data-cc-action="toggle-spell-known"]').click();
  if(journey.mode!=='known')await card.locator('[data-cc-action="toggle-spell-prepared"]').click();
  const cantripId=journey.classes.some(([id])=>['bard','sorcerer','warlock','wizard'].includes(id)) ? 'blade-ward' : 'guidance';
  await page.locator('#ccDefaultSpellSearch').fill(cantripId==='blade-ward' ? 'Blade Ward' : 'Guidance');
  const cantrip=page.locator('article[data-spell-id="'+cantripId+'"]');await expect(cantrip).toBeVisible();
  await cantrip.locator('[data-cc-action="toggle-spell-known"]').click();
  await page.locator('[data-cc-action="save-character"]').first().click();
  await expect.poll(async()=>(await savedJourneyCharacters(page,roomCode)).filter(c=>c.identity?.name===name).length).toBe(1);
  let hero=(await savedJourneyCharacters(page,roomCode)).find(c=>c.identity?.name===name);const id=hero.id;
  expect(hero.classProgression.classes.map(c=>c.level)).toEqual(journey.classes.map(([,level])=>level));expect(hero.magic.slots['1']).toBe(4);expect(hero.magic.slots['2']).toBe(journey.secondSlots);if(journey.thirdSlots!==undefined)expect(hero.magic.slots['3'] || 0).toBe(journey.thirdSlots);
  await record(page,['rooms',roomCode,'tokens','journey-caster'],{id:'journey-caster',name,ownerUid:uid,linkedCharacterId:id,type:'player',sourceType:'character',visibility:'shared',mapMode:'single',x:50,y:50,currentHp:20,maxHp:20,movementSpeed:30});
  const cast=async(kind,level,confirm=true,spellId=journey.spellId)=>{
    await openJourneySheet(page,id);await page.locator('[data-character-sheet-tab="spells"]').click();
    await page.locator('[data-sheet-spell-id="'+spellId+'"] [data-character-sheet-action="target-spell"]').click();
    const slots=page.locator('#spellCastingSlotSelect');await expect(slots).toBeVisible();const value=await slots.locator('option').evaluateAll((options,{kind,level})=>options.find(o=>!o.disabled&&o.value.startsWith(kind+'|'+level+'|'))?.value,{kind,level});expect(value).toBeTruthy();await slots.selectOption(value);
    if(spellId===journey.spellId){
      const sourceId=decodeURIComponent(value.split('|')[3]);const option=await page.evaluate(({kind,level,sourceId})=>window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellCastState().slotOptions.find(option=>option.kind===kind&&option.level===level&&option.castingSourceId===sourceId),{kind,level,sourceId});
      const ability=['wizard','artificer'].includes(journey.caster)?'int':['cleric','druid','ranger'].includes(journey.caster)?'wis':'cha';const modifier={int:4,wis:3,cha:2}[ability];const total=journey.classes.reduce((sum,[,level])=>sum+level,0);
      expect(option.castingSourceName.toLowerCase()).toContain(journey.caster);expect(option.spellcastingAbility).toBe(ability);expect(option.spellSaveDc).toBe(8+Math.ceil(total/4)+1+modifier);
    }
    if(await page.locator('#confirmSpellCastButton').isDisabled()){const caster=await page.locator('.hg-token[data-token-id="journey-caster"]').boundingBox();await page.mouse.click(caster.x+caster.width/2,caster.y+caster.height/2);}
    await expect(page.locator('#confirmSpellCastButton')).toBeEnabled();if(confirm){await page.locator('#confirmSpellCastButton').click();await expect(page.locator('#confirmSpellCastButton')).toHaveText('Cast Confirmed');}await page.locator('#cancelSpellCastButton').click();
  };
  await cast('cantrip',0,true,cantripId);expect((await record(page,['rooms',roomCode,'characters',id])).magic.slotUsage.normal['1'] || 0).toBe(0);
  await cast('normal',1,false);expect((await record(page,['rooms',roomCode,'characters',id])).magic.slotUsage.normal['1'] || 0).toBe(0);
  await cast('normal',1);await expect.poll(async()=>(await record(page,['rooms',roomCode,'characters',id])).magic.slotUsage.normal['1']).toBe(1);
  await expect.poll(async()=>(await record(page,['rooms',roomCode,'characters',id])).combat.concentration?.spellId).toBe(journey.concentrationSpellId || journey.spellId);
  if(journey.pact){
    await cast('pact',2);await expect.poll(async()=>(await record(page,['rooms',roomCode,'characters',id])).magic.slotUsage.pact).toBe(1);
    await cast('pact',2);await expect.poll(async()=>(await record(page,['rooms',roomCode,'characters',id])).magic.slotUsage.pact).toBe(2);
    await openJourneySheet(page,id);await page.locator('[data-character-sheet-tab="spells"]').click();await page.locator('[data-sheet-spell-id="'+journey.spellId+'"] [data-character-sheet-action="target-spell"]').click();
    await expect.poll(async()=>page.locator('#spellCastingSlotSelect option').evaluateAll(options=>options.filter(option=>!option.disabled&&option.value.startsWith('pact|')).length)).toBe(0);
    await page.locator('#cancelSpellCastButton').click();
  }
  for(let used=2;used<=4;used++){await cast('normal',1);await expect.poll(async()=>(await record(page,['rooms',roomCode,'characters',id])).magic.slotUsage.normal['1']).toBe(used);}
  await openJourneySheet(page,id);await page.locator('[data-character-sheet-tab="spells"]').click();await page.locator('[data-sheet-spell-id="'+journey.spellId+'"] [data-character-sheet-action="target-spell"]').click();
  await expect.poll(async()=>page.locator('#spellCastingSlotSelect option').evaluateAll(options=>options.filter(option=>!option.disabled&&option.value.startsWith('normal|1|')).length)).toBe(0);await page.locator('#cancelSpellCastButton').click();
  if(journey.upcast){await cast('normal',journey.upcast);await expect.poll(async()=>(await record(page,['rooms',roomCode,'characters',id])).magic.slotUsage.normal[String(journey.upcast)]).toBe(1);}
  await page.reload();await expect(page.locator('#homebrewGodSmokeResult')).toContainText('SMOKE TEST PASS',{timeout:60000});
  await expect(page.locator('.hg-token[data-token-id="journey-caster"]')).toBeVisible();
  await openJourneySheet(page,id);await page.locator('[data-character-sheet-action="short-rest"]').click();
  if(journey.pact)await expect.poll(async()=>(await record(page,['rooms',roomCode,'characters',id])).magic.slotUsage.pact).toBe(0);
  hero=await record(page,['rooms',roomCode,'characters',id]);expect(hero.magic.slotUsage.normal['1']).toBe(4);if(journey.upcast)expect(hero.magic.slotUsage.normal[String(journey.upcast)]).toBe(1);
  await page.locator('[data-character-sheet-action="long-rest"]').click();await expect.poll(async()=>(await record(page,['rooms',roomCode,'characters',id])).magic.slotUsage.normal['1']).toBe(0);
  if(journey.upcast)await expect.poll(async()=>(await record(page,['rooms',roomCode,'characters',id])).magic.slotUsage.normal[String(journey.upcast)]).toBe(0);
  await expect.poll(async()=>(await record(page,['rooms',roomCode,'characters',id])).combat.concentration ?? null).toBeNull();
});


async function createEffectCaster(page,{primary='bard',primaryLevel=3,secondaryLevel=3,subclass='Light'}={}) {
  page.setDefaultTimeout(15000);page.on('dialog',dialog=>dialog.accept());
  await page.route('https://example.test/effects-map.svg',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#334455"/></svg>'}));
  const uid=await signIn(page,'Effect Tester');await page.locator('#roomNameInput').fill('Spell effects');await page.locator('#createRoomButton').click();
  await expect(page.locator('#roomCodeText')).toHaveText(/^[A-Z0-9]+-[A-Z0-9]+$/);const roomCode=(await page.locator('#roomCodeText').textContent()).trim();
  await page.evaluate(async({base,roomCode})=>{const {getFirestore,doc,updateDoc}=await import(base+'firebase-firestore.js');await updateDoc(doc(getFirestore(),'rooms',roomCode),{currentMap:{id:'effects-map',name:'Effects map',url:'https://example.test/effects-map.svg'}});},{base:firebase,roomCode});
  await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen('characterCreator'));await page.locator('[data-cc-action="new-character"]').first().click();await page.locator('#ccCharacterName').fill('Effect Caster');
  await page.locator('.hg-character-step-button[data-step-id="class"]').click();await page.locator('#ccClassBuildTotalLevel').fill(String(primaryLevel+secondaryLevel));await page.locator('#ccClassBuildTotalLevel').blur();await page.locator('[data-build-mode="multiclass"]').click();
  for(const id of [primary,'cleric'])await page.locator('[data-cc-action="toggle-class-build-class"][data-class-id="'+id+'"]').click();
  for(let i=1;i<secondaryLevel;i++)await page.locator('[data-cc-action="adjust-class-build-level"][data-class-id="cleric"][data-level-delta="1"]').click();await page.locator('[data-cc-action="confirm-class-build"]').click();
  await page.locator('[data-multiclass-subclass-index="1"]').selectOption({label:subclass});
  await page.locator('.hg-character-step-button[data-step-id="abilities"]').click();await page.locator('#ccAbilityMethod').selectOption('manual');
  for(const [ability,score] of [['int',18],['wis',18],['cha',14]]){await page.locator('#ccAbility-'+ability).fill(String(score));await page.locator('#ccAbility-'+ability).blur();}
  return {uid,roomCode};
}
async function chooseEffectSpell(page,name,caster,{known=false,prepared=false}={}) {
  await page.locator('.hg-character-step-button[data-step-id="spells"]').click();await page.locator('#ccDefaultSpellSearch').fill(name);
  const card=page.locator('article[data-cc-default-spell-option]').filter({has:page.getByRole('heading',{name,exact:true})});await expect(card).toBeVisible();const source=card.locator('[data-cc-spell-source-select]');
  if(await source.count()){const value=await source.locator('option').evaluateAll((options,caster)=>options.find(o=>o.textContent.toLowerCase().startsWith(caster+' '))?.value,caster);expect(value).toBeTruthy();await source.selectOption(value);}
  if(known)await card.locator('[data-cc-action="toggle-spell-known"]').click();if(prepared)await card.locator('[data-cc-action="toggle-spell-prepared"]').click();
}
async function saveEffectCaster(page,context,{area=false}={}) {
  await page.locator('[data-cc-action="save-character"]').first().click();await expect.poll(async()=>(await savedJourneyCharacters(page,context.roomCode)).filter(c=>c.identity?.name==='Effect Caster').length).toBe(1);
  const hero=(await savedJourneyCharacters(page,context.roomCode)).find(c=>c.identity?.name==='Effect Caster');
  await record(page,['rooms',context.roomCode,'tokens','effect-caster'],{id:'effect-caster',name:'Effect Caster',ownerUid:context.uid,linkedCharacterId:hero.id,type:'player',sourceType:'character',visibility:'shared',mapMode:'single',x:area?20:50,y:50,currentHp:20,maxHp:20,movementSpeed:30});
  return {...context,id:hero.id};
}
async function startEffectCast(page,context,spellId,{caster='cleric',level=2,targetId='effect-caster'}={}) {
  await openJourneySheet(page,context.id);await page.locator('[data-character-sheet-tab="spells"]').click();await page.locator('[data-sheet-spell-id="'+spellId+'"] [data-character-sheet-action="target-spell"]').click();
  const slots=page.locator('#spellCastingSlotSelect');await expect(slots).toBeVisible();const value=await slots.locator('option').evaluateAll((options,{caster,level})=>options.find(o=>!o.disabled&&o.value.startsWith('normal|'+level+'|')&&o.textContent.toLowerCase().includes(caster))?.value,{caster,level});expect(value).toBeTruthy();await slots.selectOption(value);
  if(targetId){const target=await page.locator('.hg-token[data-token-id="'+targetId+'"]').boundingBox();await page.mouse.click(target.x+target.width/2,target.y+target.height/2);}
  await expect(page.locator('#confirmSpellCastButton')).toBeEnabled();
}

test('spell effects: healing follows the selected Bard or Cleric after upcasting and reopening',async({page})=>{
  test.setTimeout(180000);const context=await createEffectCaster(page);
  await chooseEffectSpell(page,'Cure Wounds','bard',{known:true});await chooseEffectSpell(page,'Cure Wounds','cleric',{prepared:true});const saved=await saveEffectCaster(page,context);
  await startEffectCast(page,saved,'cure-wounds',{caster:'bard'});await expect(page.locator('#spellCastingResolution')).toContainText('2d8 + 2');await page.locator('#cancelSpellCastButton').click();
  expect((await record(page,['rooms',saved.roomCode,'characters',saved.id])).magic.slotUsage.normal['2'] || 0).toBe(0);
  await startEffectCast(page,saved,'cure-wounds');await expect(page.locator('#spellCastingResolution')).toContainText('2d8 + 4');await page.locator('#confirmSpellCastButton').click();await expect(page.locator('#confirmSpellCastButton')).toHaveText('Cast Confirmed');
  expect(await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellCastState().resolution.healing)).toEqual(['2d8 + 4']);await page.locator('#cancelSpellCastButton').click();
  // Apply an adjudicated healing roll through the sheet and verify the linked map token stays in sync.
  await openJourneySheet(page,saved.id);await page.locator('[data-character-sheet-tab="actions"]').click();
  await page.locator('[data-character-sheet-input="hp-amount"]').fill('20');await page.locator('[data-character-sheet-action="set-current-hp"]').click();
  await expect.poll(async()=>(await record(page,['rooms',saved.roomCode,'characters',saved.id])).combat.currentHp).toBe(20);
  const beforeHealing=(await record(page,['rooms',saved.roomCode,'characters',saved.id])).combat;
  expect(beforeHealing.currentHp).toBeGreaterThan(6);
  await page.locator('[data-character-sheet-input="hp-amount"]').fill('6');await page.locator('[data-character-sheet-action="damage"]').click();
  await expect.poll(async()=>(await record(page,['rooms',saved.roomCode,'characters',saved.id])).combat.currentHp).toBe(beforeHealing.currentHp-6);
  await page.locator('[data-character-sheet-input="hp-amount"]').fill('8');await page.locator('[data-character-sheet-action="heal"]').click();
  const healedHp=Math.min(beforeHealing.maxHp,beforeHealing.currentHp+2);
  await expect.poll(async()=>(await record(page,['rooms',saved.roomCode,'characters',saved.id])).combat.currentHp).toBe(healedHp);
  await expect.poll(async()=>(await record(page,['rooms',saved.roomCode,'tokens','effect-caster'])).currentHp).toBe(healedHp);
  await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen('battle'));
  await page.reload();await expect(page.locator('.hg-token[data-token-id="effect-caster"]')).toBeVisible({timeout:60000});
  expect((await record(page,['rooms',saved.roomCode,'characters',saved.id])).combat.currentHp).toBe(healedHp);
  await startEffectCast(page,saved,'cure-wounds',{caster:'bard',level:1});await expect(page.locator('#spellCastingResolution')).toContainText('1d8 + 2');await page.locator('#cancelSpellCastButton').click();
  expect((await record(page,['rooms',saved.roomCode,'characters',saved.id])).magic.slotUsage.normal['2']).toBe(1);
});

test('spell effects: subclass-granted Burning Hands keeps Cleric DC and cone targets',async({page})=>{
  test.setTimeout(180000);const saved=await saveEffectCaster(page,await createEffectCaster(page));
  for(const [id,x,y] of [['near-one',55,50],['near-two',56,51],['far-away',90,90]])await record(page,['rooms',saved.roomCode,'tokens',id],{id,name:id,ownerUid:saved.uid,type:'enemy',sourceType:'manual',visibility:'shared',mapMode:'single',x,y,currentHp:30,maxHp:30,movementSpeed:30});
  await startEffectCast(page,saved,'burning-hands',{targetId:'near-one'});await expect(page.locator('#spellCastingResolution')).toContainText('4d6 fire');await expect(page.locator('#spellCastingResolution')).toContainText('15');
  const targets=await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellCastState().target.affectedTokens.map(t=>t.id));expect(targets).toEqual(expect.arrayContaining(['near-one','near-two']));expect(targets).not.toContain('far-away');
  await page.locator('#confirmSpellCastButton').click();await expect(page.locator('#confirmSpellCastButton')).toHaveText('Cast Confirmed');const result=await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellCastState().resolution);expect(result.save).toMatchObject({ability:'dex',dc:15});expect(result.damage).toEqual(['4d6 fire']);
  await expect.poll(async()=>(await record(page,['rooms',saved.roomCode,'characters',saved.id])).magic.slotUsage.normal['2']).toBe(1);
  await page.locator('#cancelSpellCastButton').click();await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen('characterCreator'));
  const library=page.locator('[data-cc-action="library"]').first();if(await library.isVisible())await library.click();await page.locator('[data-cc-action="edit-character"][data-character-id="'+saved.id+'"]').click();
  await page.locator('.hg-character-step-button[data-step-id="class"]').click();await page.locator('[data-multiclass-subclass-index="1"]').selectOption({label:'Life'});await page.locator('[data-cc-action="save-character"]').first().click();
  await expect.poll(async()=>Object.values((await record(page,['rooms',saved.roomCode,'characters',saved.id])).magic.classSources).find(source=>source.classId==='cleric')?.alwaysPreparedSpellIds).toContain('bless');
  await openJourneySheet(page,saved.id);await page.locator('[data-character-sheet-tab="spells"]').click();await expect(page.locator('[data-sheet-spell-id="bless"]')).toBeVisible();await expect(page.locator('[data-sheet-spell-id="burning-hands"]')).toHaveCount(0);
});

test('spell effects: upcast Fireball uses its sphere, Wizard DC, and shared fourth-level slot',async({page})=>{
  test.setTimeout(180000);const context=await createEffectCaster(page,{primary:'wizard',primaryLevel:5,secondaryLevel:3});await chooseEffectSpell(page,'Fireball','wizard',{known:true,prepared:true});const saved=await saveEffectCaster(page,context,{area:true});
  for(const [id,x,y] of [['near-one',60,50],['near-two',65,50],['far-away',90,90]])await record(page,['rooms',saved.roomCode,'tokens',id],{id,name:id,ownerUid:saved.uid,type:'enemy',sourceType:'manual',visibility:'shared',mapMode:'single',x,y,currentHp:30,maxHp:30,movementSpeed:30});
  await startEffectCast(page,saved,'fireball',{caster:'wizard',level:4,targetId:'near-one'});await expect(page.locator('#spellCastingResolution')).toContainText('9d6 fire');
  const state=await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellCastState());expect(state.instruction.templateShape).toBe('sphere');expect(state.target.affectedTokens.map(t=>t.id)).toEqual(expect.arrayContaining(['near-one','near-two']));expect(state.target.affectedTokens.map(t=>t.id)).not.toContain('far-away');
  await page.locator('#confirmSpellCastButton').click();await expect(page.locator('#confirmSpellCastButton')).toHaveText('Cast Confirmed');const result=await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellCastState().resolution);expect(result.save).toMatchObject({ability:'dex',dc:15});expect(result.damage).toEqual(['9d6 fire']);
  await expect.poll(async()=>(await record(page,['rooms',saved.roomCode,'characters',saved.id])).magic.slotUsage.normal['4']).toBe(1);
});


test('spell effects: split projectiles spend one slot and adjudicated target HP and conditions survive reload',async({page})=>{
 test.setTimeout(180000);const context=await createEffectCaster(page,{primary:'wizard'});await chooseEffectSpell(page,'Magic Missile','wizard',{known:true,prepared:true});const saved=await saveEffectCaster(page,context,{area:true});
 for(const [id,x,y] of [['dart-one',55,50],['dart-two',70,65]])await record(page,['rooms',saved.roomCode,'tokens',id],{id,name:id,ownerUid:saved.uid,type:'enemy',sourceType:'manual',visibility:'shared',mapMode:'single',x,y,currentHp:30,maxHp:30,movementSpeed:30});
 await startEffectCast(page,saved,'magic-missile',{caster:'wizard',level:2,targetId:'dart-one'});
 const choices=page.locator('#spellProjectileTargets select');await expect(choices).toHaveCount(4);await choices.nth(2).selectOption('dart-two');await choices.nth(3).selectOption('dart-two');
 await page.locator('#confirmSpellCastButton').click();await expect(page.locator('#confirmSpellCastButton')).toHaveText('Cast Confirmed');
 const resolution=await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellCastState().resolution);expect(resolution.projectiles.map(p=>p.targetId)).toEqual(['dart-one','dart-one','dart-two','dart-two']);
 await expect.poll(async()=>(await record(page,['rooms',saved.roomCode,'characters',saved.id])).magic.slotUsage.normal['2']).toBe(1);
 await page.locator('#cancelSpellCastButton').click();
 // Apply explicit DM-adjudicated totals through the real map controls; casting alone does not invent hit/save outcomes.
 for(const [id,hp] of [['dart-one',24],['dart-two',22]]){
  await page.locator('.hg-token[data-token-id="'+id+'"]').click({button:'right'});page.removeAllListeners('dialog');page.once('dialog',dialog=>dialog.accept(String(hp)));await page.getByRole('menuitem',{name:'Adjust HP',exact:true}).click();
  await expect.poll(async()=>(await record(page,['rooms',saved.roomCode,'tokens',id])).currentHp).toBe(hp);
 }
 await page.locator('.hg-token[data-token-id="dart-one"]').click({button:'right'});await page.getByRole('menuitem',{name:'Apply / Remove Condition',exact:true}).click();
 await page.locator('[data-effect-field="definitionId"]').selectOption('poisoned');await page.locator('[data-effect-field="targetTokenId"]').selectOption('dart-one');await page.getByRole('button',{name:'Apply Effect',exact:true}).click();
 await expect.poll(async()=>Object.values((await record(page,['rooms',saved.roomCode,'tokens','dart-one'])).effectConditions||{})).toContain('poisoned');
 expect(Object.values((await record(page,['rooms',saved.roomCode,'tokens','dart-two'])).effectConditions||{})).not.toContain('poisoned');
 await page.reload();await expect(page.locator('#homebrewGodSmokeResult')).toContainText('SMOKE TEST PASS',{timeout:60000});await expect(page.locator('.hg-token[data-token-id="dart-one"]')).toBeVisible();
 expect((await record(page,['rooms',saved.roomCode,'tokens','dart-one'])).currentHp).toBe(24);expect((await record(page,['rooms',saved.roomCode,'tokens','dart-two'])).currentHp).toBe(22);
 await page.locator('.hg-token[data-token-id="dart-one"]').click({button:'right'});await page.getByRole('menuitem',{name:'Apply / Remove Condition',exact:true}).click();
 await page.locator('.hg-gameplay-effect-card').filter({hasText:'Poisoned'}).getByRole('button',{name:'Remove',exact:true}).click();
 await expect.poll(async()=>Object.values((await record(page,['rooms',saved.roomCode,'tokens','dart-one'])).effectConditions||{})).toHaveLength(0);
 expect((await record(page,['rooms',saved.roomCode,'characters',saved.id])).magic.slotUsage.normal['2']).toBe(1);
});


test('spell effects: Death domain Ray of Sickness works without repairing its definition and survives reopening',async({page})=>{
 test.setTimeout(180000);const context=await createEffectCaster(page,{subclass:'Death'});
 await page.locator('.hg-character-step-button[data-step-id="spells"]').click();await page.locator('#ccDefaultSpellSearch').fill('Ray of Sickness');
 const card=page.locator('article[data-spell-id="ray-of-sickness"]');await expect(card).toContainText('2024 spell mechanics');await expect(card).not.toContainText('requires a spell definition');
 const saved=await saveEffectCaster(page,context);
 await startEffectCast(page,saved,'ray-of-sickness',{level:3});await expect(page.locator('#spellCastingResolution')).toContainText('4d8 poison');await expect(page.locator('#spellCastingResolution')).not.toContainText('CON save');
 await page.locator('#confirmSpellCastButton').click();await expect(page.locator('#confirmSpellCastButton')).toHaveText('Cast Confirmed');
 await expect.poll(async()=>(await record(page,['rooms',saved.roomCode,'characters',saved.id])).magic.slotUsage.normal['3']).toBe(1);
 await page.reload();await expect(page.locator('#homebrewGodSmokeResult')).toContainText('SMOKE TEST PASS',{timeout:60000});
 await openJourneySheet(page,saved.id);await page.locator('[data-character-sheet-tab="spells"]').click();const row=page.locator('[data-sheet-spell-id="ray-of-sickness"]');await expect(row).toBeVisible();await expect(row.locator('[data-character-sheet-action="target-spell"]')).toBeEnabled();
 expect((await record(page,['rooms',saved.roomCode,'characters',saved.id])).magic.slotUsage.normal['3']).toBe(1);
});
