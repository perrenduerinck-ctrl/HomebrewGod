import test from "node:test";
import assert from "node:assert/strict";
import {
  isBackForwardCacheEvent,
  shouldTearDownPage
} from "../shared/pageLifecycle.js";

test("bfcache pagehide preserves live application systems", () => {
  const event = { persisted: true };

  assert.equal(isBackForwardCacheEvent(event), true);
  assert.equal(shouldTearDownPage(event), false);
});

test("ordinary pagehide performs final application teardown", () => {
  assert.equal(isBackForwardCacheEvent({ persisted: false }), false);
  assert.equal(shouldTearDownPage({ persisted: false }), true);
  assert.equal(shouldTearDownPage(), true);
});
