import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(
  new URL("../app.js", import.meta.url),
  "utf8"
);

test(
  "creator entry points are absent from the startup import graph",
  () => {
    assert.doesNotMatch(
      appSource,
      /import\s+\{\s*createCharacterCreator\s*\}\s+from\s+["']\.\/characterCreator\.js["']/
    );
    assert.doesNotMatch(
      appSource,
      /import\s+\{\s*createMonsterCreator\s*\}\s+from\s+["']\.\/monsterCreator\.js["']/
    );
    assert.match(
      appSource,
      /characterCreatorModulePromise\s*=\s*import\(\s*["']\.\/characterCreator\.js["']\s*\)/
    );
    assert.match(
      appSource,
      /monsterCreatorModulePromise\s*=\s*import\(\s*["']\.\/monsterCreator\.js["']\s*\)/
    );
  }
);

test(
  "creator modules load once and only from their requested initialization paths",
  () => {
    const characterInitializerStart =
      appSource.indexOf(
        "async function initCharacterCreatorSystem()"
      );
    const monsterInitializerStart =
      appSource.indexOf(
        "async function initMonsterCreatorSystem()"
      );
    const navigationStart =
      appSource.indexOf(
        "// APP SECTION 13A"
      );

    assert.ok(characterInitializerStart > -1);
    assert.ok(monsterInitializerStart > characterInitializerStart);
    assert.ok(navigationStart > monsterInitializerStart);

    const characterInitializer =
      appSource.slice(
        characterInitializerStart,
        monsterInitializerStart
      );
    const monsterInitializer =
      appSource.slice(
        monsterInitializerStart,
        navigationStart
      );

    assert.match(
      characterInitializer,
      /if\s*\(!characterCreatorModulePromise\)/
    );
    assert.match(
      characterInitializer,
      /await characterCreatorModulePromise/
    );
    assert.doesNotMatch(
      characterInitializer,
      /monsterCreator\.js/
    );

    assert.match(
      monsterInitializer,
      /if\s*\(!monsterCreatorModulePromise\)/
    );
    assert.match(
      monsterInitializer,
      /await monsterCreatorModulePromise/
    );
    assert.doesNotMatch(
      monsterInitializer,
      /characterCreator\.js/
    );
  }
);

test(
  "creator routes wait for lazy initialization before reporting ready",
  () => {
    assert.match(
      appSource,
      /async function openStartupViewIfNeeded\(\)/
    );
    assert.match(
      appSource,
      /startupView === "characterCreator"[\s\S]*?await initCharacterCreatorSystem\(\)/
    );
    assert.match(
      appSource,
      /startupView === "monsterCreator"[\s\S]*?await initMonsterCreatorSystem\(\)/
    );
    assert.match(
      appSource,
      /openScreen:\s*\n\s*async function \(screenName\)/
    );
  }
);
