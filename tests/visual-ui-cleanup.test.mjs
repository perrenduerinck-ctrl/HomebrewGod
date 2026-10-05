import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the application loads the shared visual system after feature styles", () => {
  const html = read("index.html");
  const tokens = read("assets/styles/tokens.css");
  const foundation = read("assets/styles/foundation.css");
  const components = read("assets/styles/components.css");
  const screens = read("assets/styles/screens.css");
  const responsive = read("assets/styles/responsive.css");

  for (const href of [
    "assets/styles/tokens.css",
    "assets/styles/foundation.css",
    "assets/styles/components.css",
    "assets/styles/screens.css",
    "assets/styles/responsive.css"
  ]) assert.match(html, new RegExp(href.replaceAll("/", "\\/")));

  assert.match(tokens, /--hg-bg:/);
  assert.match(tokens, /--hg-accent:/);
  assert.match(foundation, /:focus-visible/);
  assert.match(components, /\.hg-panel/);
  assert.match(components, /\.hg-status-message/);
  assert.match(components, /\.hg-empty-state/);
  assert.match(screens, /#battleTopBar/);
  assert.match(screens, /\.workshop-tabs > button\s*\{[\s\S]*flex:\s*0 0 auto/);
  assert.match(responsive, /@media \(max-width: 390px\)/);
  assert.match(responsive, /@media \(min-width: 901px\) and \(max-height: 800px\)/);
});

test("auth, lobby, creators and feedback use accessible shared patterns", () => {
  const html = read("index.html");
  const polish = read("ui/visualPolish.js");
  const monster = read("monsters/creator.js");
  const character = read("characterCreator/index.js");

  assert.match(html, /<label for="guestNameInput">Display name<\/label>/);
  assert.match(html, /autocomplete="email"/);
  assert.match(html, /class="hg-lobby-grid"/);
  assert.match(html, /class="hg-room-grid"/);
  assert.match(polish, /data-hg-toast-region/);
  assert.match(polish, /className = "hg-confirm-dialog"/);
  assert.match(polish, /main\.screen:not\(\.hidden\)/);
  assert.match(monster, /overflowPanel\.append\(button\)/);
  assert.match(character, /<details class="hg-overflow-menu">[\s\S]*Save Draft Copy/);
});

test("Workshop presentation is maintainable and externalized", () => {
  const html = read("index.html");
  const styles = read("workshop/workshopStyles.js");
  const workshopCss = read("workshop/workshop.css");

  assert.match(html, /workshop\/workshop\.css/);
  assert.match(styles, /new URL\("\.\/workshop\.css", import\.meta\.url\)/);
  assert.doesNotMatch(styles, /style\.textContent\s*=/);
  assert.match(workshopCss, /\.workshop-toolbar/);
  assert.match(workshopCss, /\.workshop-dialog/);
});
