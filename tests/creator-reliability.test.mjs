import assert from "node:assert/strict";
import test from "node:test";

import { createCreatorDraftLifecycle } from "../shared/creatorDraftLifecycle.js";
import { setCreatorControlsBusy } from "../shared/creatorFormState.js";
import { saveRevisionedRecord } from "../shared/revisionedPersistence.js";
import { normalizeEncounter } from "../encounters/encounterModel.js";
import { normalizeMagicItem } from "../items/magicItemModel.js";
import { normalizeMonsterRecord } from "../monsters/creator.js";
import { normalizeNpc } from "../npcs/npcModel.js";
import { normalizeNpcRelationship } from "../npcs/relationshipModel.js";
import { normalizeHomebrewSpell } from "../spells/spellModel.js";
import { normalizeSummonPreset } from "../summons/summonPresetModel.js";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values
  };
}

function createRoot({ localStorage, sessionStorage }) {
  const listeners = new Map();
  const view = {
    localStorage,
    sessionStorage,
    setTimeout,
    clearTimeout,
    queueMicrotask
  };
  return {
    ownerDocument: { defaultView: view },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
    dispatch(type) { listeners.get(type)?.({ type }); }
  };
}

test("creator drafts recover only for the same account and tab", async () => {
  const localStorage = createStorage();
  const sessionStorage = createStorage();
  let draft = { name: "Original" };
  const root = createRoot({ localStorage, sessionStorage });
  const lifecycle = createCreatorDraftLifecycle({
    root,
    creatorId: "spell",
    getUserId: () => "user-a",
    getDraft: () => draft,
    applyDraft: (value) => { draft = value; },
    requestConfirmation: async () => false,
    debounceMs: 0
  });
  lifecycle.markClean();
  draft = { name: "Recovered work" };
  root.dispatch("input");
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(lifecycle.hasChanges(), true);

  let recovered = null;
  const sameTab = createCreatorDraftLifecycle({
    root: createRoot({ localStorage, sessionStorage }),
    creatorId: "spell",
    getUserId: () => "user-a",
    getDraft: () => recovered,
    applyDraft: (value) => { recovered = value; },
    requestConfirmation: async () => false
  });
  assert.equal(sameTab.recover(), true);
  assert.deepEqual(recovered, { name: "Recovered work" });

  const otherAccount = createCreatorDraftLifecycle({
    root: createRoot({ localStorage, sessionStorage }),
    creatorId: "spell",
    getUserId: () => "user-b",
    getDraft: () => null,
    applyDraft: () => assert.fail("another account must not receive the draft"),
    requestConfirmation: async () => false
  });
  assert.equal(otherAccount.recover(), false);
  lifecycle.destroy();
  sameTab.destroy();
  otherAccount.destroy();
});

test("creator replacement requires explicit discard and preserves recovery on cancel", async () => {
  const localStorage = createStorage();
  const sessionStorage = createStorage();
  let draft = { name: "Original" };
  let allowDiscard = false;
  const root = createRoot({ localStorage, sessionStorage });
  const lifecycle = createCreatorDraftLifecycle({
    root,
    creatorId: "npc",
    getUserId: () => "user-a",
    getDraft: () => draft,
    applyDraft: (value) => { draft = value; },
    requestConfirmation: async () => allowDiscard,
    debounceMs: 0
  });
  lifecycle.markClean();
  draft = { name: "Unsaved" };
  lifecycle.markChanged();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(await lifecycle.confirmReplacement("open another NPC"), false);
  assert.equal(localStorage.values.size, 1);
  allowDiscard = true;
  assert.equal(await lifecycle.confirmReplacement(
    "open another NPC",
    { restoreBaseline: true }
  ), true);
  assert.deepEqual(draft, { name: "Original" });
  assert.equal(localStorage.values.size, 0);
  lifecycle.destroy();
});

test("busy creator controls restore their original disabled states", () => {
  const controls = [
    { disabled: false, dataset: {} },
    { disabled: true, dataset: {} }
  ];
  const root = { querySelectorAll: () => controls };
  setCreatorControlsBusy(root, true);
  assert.deepEqual(controls.map((control) => control.disabled), [true, true]);
  setCreatorControlsBusy(root, false);
  assert.deepEqual(controls.map((control) => control.disabled), [false, true]);
  assert.deepEqual(controls.map((control) => control.dataset), [{}, {}]);
});

test("shared revision persistence rejects a stale creator save", async () => {
  const reference = { path: "users/user-a/spells/test" };
  let remote = { id: "test", ownerUid: "user-a", revision: 1, name: "Original" };
  const runTransaction = async (_db, operation) => operation({
    get: async () => ({ exists: () => true, data: () => structuredClone(remote) }),
    set: (_target, value) => { remote = { ...remote, ...structuredClone(value) }; }
  });
  const saved = await saveRevisionedRecord({
    db: {}, reference, raw: { ...remote },
    record: { ...remote, name: "Newer" }, label: "spell", runTransaction
  });
  assert.equal(saved.revision, 2);
  await assert.rejects(
    saveRevisionedRecord({
      db: {}, reference,
      raw: { id: "test", ownerUid: "user-a", revision: 1, name: "Stale" },
      record: { id: "test", ownerUid: "user-a", name: "Stale" },
      label: "spell", runTransaction
    }),
    (error) => error.code === "revision-conflict" && error.draft.name === "Stale"
  );
  assert.equal(remote.name, "Newer");
});

test("all creator models preserve loaded revision metadata", () => {
  const revision = 7;
  assert.equal(normalizeMagicItem({ revision }).revision, revision);
  assert.equal(normalizeHomebrewSpell({ revision }).revision, revision);
  assert.equal(normalizeNpc({ revision }).revision, revision);
  assert.equal(normalizeNpcRelationship({ revision }).revision, revision);
  assert.equal(normalizeEncounter({ revision }).revision, revision);
  assert.equal(normalizeSummonPreset({ revision }).revision, revision);
  assert.equal(normalizeMonsterRecord({ revision }).revision, revision);
});
