import test from "node:test";
import assert from "node:assert/strict";
import { createAnimationLibrary, createAnimationBindings } from "../vfx/animationLibrary.js";
import { createAnimationPersistence } from "../vfx/animationPersistence.js";

const hosted = id => ({
  id,
  name: `Animation ${id}`,
  sprite: `https://res.cloudinary.com/demo/image/upload/${id}.png`,
  grid: { columns: 6, rows: 6 },
  frameCount: 36,
  ownership: { kind: "user", scope: "user", ownerId: "user-a" },
});

function fixture({ owner = "user-a", loadError = null, dependencies = {} } = {}) {
  const records = new Map();
  const writes = [];
  const deletes = [];
  const uploads = [];
  const library = createAnimationLibrary({ idFactory: () => "generated_custom" });
  let stamp = 0;
  const path = (...parts) => parts.filter(part => part != null).join("/");
  const store = createAnimationPersistence({
    library,
    db: "db",
    getUserId: () => owner,
    getRoomId: () => "ROOM",
    collection: path,
    doc: path,
    async getDocs() {
      if (loadError) throw loadError;
      return { docs: [...records].map(([id, data]) => ({ id, data: () => structuredClone(data) })) };
    },
    async setDoc(reference, data, options) {
      writes.push({ reference, data: structuredClone(data), options });
      records.set(data.id, { ...(records.get(data.id) || {}), ...structuredClone(data) });
    },
    async deleteDoc(reference) { deletes.push(reference); records.delete(reference.split("/").at(-1)); },
    serverTimestamp: () => `timestamp-${++stamp}`,
    async uploadSprite(file) {
      uploads.push(file);
      return { url: `https://res.cloudinary.com/demo/image/upload/${file.name}`, publicId: `animations/${file.name}` };
    },
    assetBaseUrl: "https://perrenduerinck-ctrl.github.io/HomebrewGod/",
    ...dependencies,
  });
  return { library, store, records, writes, deletes, uploads, setOwner: value => { owner = value; } };
}

test("built-in remixes resolve relative hosted sprites before persistence and reject insecure URLs", async () => {
  const f = fixture();
  const prepared = await f.store.prepareAnimation({ ...hosted("remix"), sprite: "./assets/vfx/library/radiant-spear.png" });
  assert.equal(prepared.definition.sprite, "https://perrenduerinck-ctrl.github.io/HomebrewGod/assets/vfx/library/radiant-spear.png");
  await assert.rejects(() => f.store.saveAnimation({ ...hosted("insecure"), sprite: "http://example.test/sprite.png" }), /secure hosted/);
  assert.equal(f.writes.length, 0);
});

test("account changes while loading cannot hydrate or publish the previous owner's library", async () => {
  let resolve;
  const f = fixture({ dependencies: { getDocs: () => new Promise(done => { resolve = done; }) } });
  const pending = f.store.load();
  f.setOwner("user-b"); f.library.setContext({ ownerId: "user-b" });
  resolve({ docs: [{ id: "private", data: () => hosted("private") }] });
  assert.equal((await pending).state, "cancelled");
  f.library.setContext({ ownerId: "user-a" });
  assert.equal(f.library.getAnimation("private"), null);
  assert.notEqual(f.store.getStatus().state, "ready");
});

test("account changes during upload reject saving into the next user's account", async () => {
  let resolve;
  const f = fixture({ dependencies: { uploadSprite: () => new Promise(done => { resolve = done; }) } });
  const pending = f.store.prepareAnimation(hosted("private"), { spriteFile: { name: "new.png" } });
  f.setOwner("user-b"); resolve({ secure_url: "https://example.test/new.png" });
  await assert.rejects(() => pending, /account changed/);
  await assert.rejects(() => f.store.saveAnimation(hosted("private")), /account changed/);
  assert.equal(f.writes.length, 0);
});

test("save candidates and delete validation cannot mutate the visible definition or references", () => {
  const f = fixture(); f.library.setContext({ ownerId: "user-a" });
  const original = f.library.registerAnimation(hosted("original"));
  const bindings = createAnimationBindings({ library: f.library });
  bindings.setAnimation("spell:test", { animations: { travel: "original" } });
  const candidate = f.library.prepareAnimationSave({ name: "Edited" }, { animationId: original.id });
  assert.equal(candidate.revision, 2); assert.equal(candidate.id, original.id);
  assert.equal(f.library.getAnimation(original.id), original);
  f.library.validateDelete(original.id, { removeReferences: true });
  assert.equal(bindings.getAssignment("spell:test").animations.travel, original.id);
  assert.equal(f.library.getAnimation(original.id), original);
});

test("unchanged library context does not interrupt an open editor or emit spurious changes", () => {
  const f = fixture(); f.library.setContext({ ownerId: "user-a", roomId: "ROOM" });
  let changes = 0; f.library.subscribe(() => changes++);
  f.library.setContext({ ownerId: "user-a", roomId: "ROOM" });
  assert.equal(changes, 0);
  f.library.setContext({ ownerId: "user-b", roomId: "ROOM" }); assert.equal(changes, 1);
});

test("save preflight applies duplicate ID and room ownership checks before remote writes", () => {
  const f = fixture(); f.library.registerAnimation(hosted("existing"));
  assert.throws(() => f.library.prepareAnimationSave(hosted("existing")), /ID already exists/);
  assert.throws(() => f.library.prepareAnimationSave({ ...hosted("room"), ownership: { scope: "room", ownerId: "OTHER" } }), /owning room/);
  assert.equal(f.writes.length, 0);
});

test("a previous account's late write failure cannot overwrite the current account's sync status", async () => {
  let reject;
  const f = fixture({ dependencies: { setDoc: () => new Promise((_, fail) => { reject = fail; }) } });
  const pending = f.store.saveAnimation(hosted("private"));
  f.setOwner("user-b"); await f.store.setContext();
  const status = f.store.getStatus(); reject(new Error("previous account failed"));
  await assert.rejects(() => pending, /previous account failed/);
  assert.deepEqual(f.store.getStatus(), status);
});

test("saved room spells protect animations even when draft references were never loaded", async () => {
  const f = fixture({ dependencies: { getDocs: async () => ({ docs: [{ data: () => ({ magic: { customSpells: [{ name: "Saved Fireball", animations: { travel: "protected" } }] } }) }] }) } });
  await assert.rejects(() => f.store.deleteAnimation("protected"), /Saved Fireball.*save the character/);
  assert.equal(f.deletes.length, 0);
});

test("signed-out animation persistence leaves the session library usable", async () => {
  const { library, store, writes } = fixture({ owner: "" });
  assert.equal(store.canPersist(), false);
  const loaded = await store.load();
  assert.equal(loaded.state, "signed-out");
  assert.equal(library.registerAnimation({ ...hosted("session_only"), ownership: { scope: "session" } }).id, "session_only");
  assert.equal(writes.length, 0);
});

test("persistent personal animations reload into a fresh library with the same ID", async () => {
  const first = fixture();
  first.records.set("custom_fire", hosted("custom_fire"));
  assert.equal((await first.store.load()).state, "ready");
  assert.equal(first.library.getAnimation("custom_fire").name, "Animation custom_fire");
  assert.equal(first.library.getAnimation("custom_fire").ownership.ownerId, "user-a");
});

test("persistent load is idempotent and does not increment revisions", async () => {
  const f = fixture();
  f.records.set("custom_fire", { ...hosted("custom_fire"), revision: 7 });
  await f.store.load();
  await f.store.load();
  assert.equal(f.library.getAnimation("custom_fire").revision, 7);
});

test("Firestore load failure is readable and built-in or session animations still work", async () => {
  const f = fixture({ loadError: new Error("offline") });
  f.library.registerAnimation({ ...hosted("local_effect"), ownership: { scope: "session" } });
  const state = await f.store.load();
  assert.equal(state.state, "offline");
  assert.match(state.message, /still work/);
  assert.equal(f.library.getAnimation("local_effect").id, "local_effect");
});

test("new sprite sheets upload before the saved definition is prepared", async () => {
  const f = fixture();
  const file = { name: "nova.png", type: "image/png", size: 2000 };
  const prepared = await f.store.prepareAnimation({ ...hosted("nova"), sprite: "data:image/png;base64,AAAA" }, { spriteFile: file });
  assert.equal(f.uploads[0], file);
  assert.equal(prepared.definition.sprite, "https://res.cloudinary.com/demo/image/upload/nova.png");
  assert.equal(prepared.asset.publicId, "animations/nova.png");
});

test("Firestore records never contain base64 sprite data", async () => {
  const f = fixture();
  const prepared = await f.store.prepareAnimation({ ...hosted("nova"), sprite: "data:image/png;base64,AAAA" }, { spriteFile: { name: "nova.png" } });
  const saved = f.library.registerAnimation(prepared.definition);
  await f.store.saveAnimation(saved, { asset: prepared.asset });
  assert.doesNotMatch(JSON.stringify(f.writes[0].data), /data:image/);
  assert.match(f.writes[0].data.sprite, /^https:\/\//);
});

test("a data URL without an upload is rejected before Firestore writes", async () => {
  const f = fixture();
  await assert.rejects(() => f.store.prepareAnimation({ ...hosted("bad"), sprite: "data:image/png;base64,AAAA" }), /uploaded/);
  assert.equal(f.writes.length, 0);
});

test("personal animation create writes the documented user collection path", async () => {
  const f = fixture();
  const prepared = await f.store.prepareAnimation(hosted("custom_fire"));
  const saved = f.library.registerAnimation(prepared.definition);
  await f.store.saveAnimation(saved);
  assert.equal(f.writes[0].reference, "db/users/user-a/animations/custom_fire");
  assert.equal(f.writes[0].data.id, "custom_fire");
  assert.equal(f.writes[0].data.ownerId, "user-a");
  assert.equal(f.writes[0].data.ownership.scope, "user");
});

test("create stores createdAt and updatedAt while edits preserve the stable ID", async () => {
  const f = fixture();
  const prepared = await f.store.prepareAnimation(hosted("custom_fire"));
  let saved = f.library.registerAnimation(prepared.definition);
  await f.store.saveAnimation(saved);
  saved = f.library.updateAnimation(saved.id, { name: "Edited fire" });
  await f.store.saveAnimation(saved);
  assert.equal(saved.id, "custom_fire");
  assert.equal(saved.revision, 2);
  assert.equal(f.writes[0].data.createdAt, "timestamp-1");
  assert.equal("createdAt" in f.writes[1].data, false);
  assert.equal(f.writes[1].data.updatedAt, "timestamp-2");
});

test("replacing a sprite preserves animation ID and advances only its revision", async () => {
  const f = fixture();
  const initial = await f.store.prepareAnimation(hosted("custom_fire"));
  let saved = f.library.registerAnimation(initial.definition);
  await f.store.saveAnimation(saved);
  const replacement = await f.store.prepareAnimation(saved, { spriteFile: { name: "replacement.webp" } });
  saved = f.library.updateAnimation(saved.id, replacement.definition);
  await f.store.saveAnimation(saved, { asset: replacement.asset });
  assert.equal(saved.id, "custom_fire");
  assert.equal(saved.revision, 2);
  assert.match(saved.sprite, /replacement\.webp$/);
  assert.equal(f.writes[1].data.spriteAsset.publicId, "animations/replacement.webp");
});

test("a session duplicate can be promoted to persistent user ownership", async () => {
  const f = fixture();
  f.library.setContext({ ownerId: "user-a" });
  const session = f.library.registerAnimation({ ...hosted("remix"), ownership: { scope: "session" } });
  const prepared = await f.store.prepareAnimation(session);
  const saved = f.library.updateAnimation(session.id, prepared.definition);
  assert.equal(saved.ownership.scope, "user");
  assert.equal(saved.ownership.ownerId, "user-a");
});

test("persistent definitions are isolated to their owning user", async () => {
  const f = fixture();
  f.records.set("private_effect", hosted("private_effect"));
  await f.store.load();
  assert.ok(f.library.getAnimation("private_effect"));
  f.library.setContext({ ownerId: "user-b" });
  assert.equal(f.library.getAnimation("private_effect"), null);
});

test("safe delete refuses referenced animations before any remote delete", async () => {
  const f = fixture();
  f.library.setContext({ ownerId: "user-a" });
  f.library.registerAnimation(hosted("used_effect"));
  const bindings = createAnimationBindings({ library: f.library });
  bindings.setAnimation("spell:fireball", { animations: { impact: "used_effect" } });
  assert.throws(() => f.library.deleteAnimation("used_effect"), /used by 1/);
  assert.equal(f.deletes.length, 0);
});

test("confirmed safe delete removes the Firestore record but retains hosted asset cleanup responsibility", async () => {
  const f = fixture();
  f.records.set("unused_effect", hosted("unused_effect"));
  await f.store.load();
  f.library.deleteAnimation("unused_effect");
  const result = await f.store.deleteAnimation("unused_effect");
  assert.equal(result.ok, true);
  assert.equal(f.deletes[0], "db/users/user-a/animations/unused_effect");
  assert.equal(f.records.has("unused_effect"), false);
});

test("missing and malformed saved records are skipped without hiding valid records", async () => {
  const f = fixture();
  f.records.set("broken", { id: "broken", sprite: "data:image/png;base64,bad" });
  f.records.set("valid", hosted("valid"));
  const result = await f.store.load();
  assert.equal(result.state, "ready");
  assert.equal(f.library.getAnimation("broken"), null);
  assert.equal(f.library.getAnimation("valid").id, "valid");
});
