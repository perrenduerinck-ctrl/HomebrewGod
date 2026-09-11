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

function fixture({ owner = "user-a", loadError = null } = {}) {
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
  });
  return { library, store, records, writes, deletes, uploads };
}

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
