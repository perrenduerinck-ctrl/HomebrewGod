import test from "node:test";
import assert from "node:assert/strict";
import { getAnimationDeletionPolicy, UNKNOWN_REMOTE_ANIMATION_WARNING } from "../vfx/animationDeletionPolicy.js";
import { createAnimationLibrary, createAnimationBindings } from "../vfx/animationLibrary.js";

const animation = { id: "owned", name: "Owned", sprite: "https://example.test/sheet.png", grid: { columns: 6, rows: 6 }, ownership: { kind: "user", scope: "user", ownerId: "a" } };
test("persistent deletion always confirms unknown remote dependencies, including zero loaded references", () => {
  const policy = getAnimationDeletionPolicy(animation);
  assert.equal(policy.confirm, true); assert.equal(policy.canReplace, false);
  assert.ok(policy.message.includes(UNKNOWN_REMOTE_ANIMATION_WARNING));
  assert.match(policy.message, /hosted sprite is retained/);
  assert.equal(policy.removeLabel, "Remove from My Library");
  assert.doesNotMatch(policy.message, /No spells use this animation/i);
});
test("session deletion is explicitly local while loaded references still require confirmation", () => {
  const session = { ...animation, ownership: { kind: "user", scope: "session" } };
  assert.equal(getAnimationDeletionPolicy(session).confirm, false);
  const policy = getAnimationDeletionPolicy(session, [{ name: "Sword" }]);
  assert.equal(policy.confirm, true); assert.equal(policy.persistent, false);
  assert.match(policy.message, /Session-only deletion/);
});
test("replacing known references changes only tracked references and retains both definitions", () => {
  const library = createAnimationLibrary(); library.setContext({ ownerId: "a" });
  const old = library.registerAnimation(animation), replacement = library.registerAnimation({ ...animation, id: "replacement" });
  const bindings = createAnimationBindings({ library });
  bindings.setAnimation("spell:loaded", { animations: { travel: old.id } });
  const unopened = { animations: { travel: old.id } };
  assert.equal(library.replaceKnownReferences(old.id, replacement.id).length, 1);
  assert.equal(bindings.getAssignment("spell:loaded").animations.travel, replacement.id);
  assert.equal(unopened.animations.travel, old.id);
  assert.equal(library.getAnimation(old.id), old); assert.equal(library.getAnimation(replacement.id), replacement);
  assert.throws(() => library.replaceKnownReferences(old.id, old.id), /different replacement/);
  assert.throws(() => library.replaceKnownReferences(old.id, "missing"), /no longer available/);
});
test("account switching hides account-owned unsaved remixes as well as persistent private definitions", () => {
  const library = createAnimationLibrary();
  const unsigned = library.registerAnimation({ ...animation, id: "unsigned", ownership: { scope: "session", ownerId: null } });
  library.setContext({ ownerId: "a" });
  library.registerAnimation(animation);
  const remix = library.duplicateAnimation(animation.id);
  assert.ok(library.getAnimation(remix.id));
  library.setContext({ ownerId: "b" });
  assert.equal(library.getAnimation(animation.id), null); assert.equal(library.getAnimation(remix.id), null);
  assert.equal(library.getAnimation(unsigned.id), unsigned);
  library.setContext({ ownerId: "a" }); assert.ok(library.getAnimation(animation.id)); assert.ok(library.getAnimation(remix.id));
});
