import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { visibleSidebarSections } from "../ui/navigation/sidebarSections.js";

const items = (role) => visibleSidebarSections({ role, roomOpen: true })
  .flatMap((section) => section.items);

test("player navigation exposes play tools without DM creation and world controls", () => {
  const player = items("player");
  const ids = player.map((item) => item.id);
  assert.ok(ids.includes("play-battle"));
  assert.ok(ids.includes("tool-combat"));
  assert.ok(ids.includes("tool-effects"));
  assert.ok(ids.includes("library-characters"));
  assert.ok(!ids.includes("create-monster"));
  assert.ok(!ids.includes("tool-map"));
  assert.ok(!ids.includes("settings-room"));
});

test("DM navigation groups every connected creator, campaign and world tool once", () => {
  const dm = items("dm");
  const ids = dm.map((item) => item.id);
  assert.ok(ids.includes("create-monster"));
  assert.ok(ids.includes("tool-token"));
  assert.ok(ids.includes("campaign-room"));
  assert.ok(ids.includes("world-time"));
  assert.equal(new Set(ids).size, ids.length);
});

test("navigation stays hidden without an open room and shell modules retain accessibility contracts", () => {
  assert.deepEqual(visibleSidebarSections({ role: "dm", roomOpen: false }), []);
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const sidebar = readFileSync(new URL("../ui/navigation/sidebar.js", import.meta.url), "utf8");
  const drawer = readFileSync(new URL("../ui/navigation/toolDrawer.js", import.meta.url), "utf8");
  assert.match(app, /animationLibraryButton:\s*\$\("animationLibraryButton"\)/);
  assert.match(app, /animationCreatorButton:\s*\$\("animationCreatorButton"\)/);
  assert.match(app, /function syncMainScreenRoute\(screenName\)/);
  assert.match(app, /syncMainScreenRoute\(screenName\);[\s\S]*initCharacterCreatorSystem\(\)/);
  assert.match(app, /history\.replaceState/);
  assert.match(sidebar, /aria-expanded/);
  assert.match(sidebar, /localStorage|STORAGE_KEY/);
  assert.match(sidebar, /keydown/);
  assert.match(drawer, /aria-modal/);
  assert.match(drawer, /replaceWith\(mounted\)/);
});
