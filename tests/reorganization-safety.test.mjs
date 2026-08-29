import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function read(relativePath) {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8"
  );
}

test("Firebase configuration still owns the rules and functions directories", () => {
  const firebase = JSON.parse(read("firebase.json"));
  const functionsPackage = JSON.parse(
    read("functions/package.json")
  );

  assert.equal(firebase.firestore?.rules, "firestore.rules");
  assert.equal(firebase.functions?.source, "functions");
  assert.equal(firebase.functions?.runtime, "nodejs20");
  assert.equal(functionsPackage.main, "index.js");
  assert.equal(functionsPackage.engines?.node, "20");
  assert.ok(functionsPackage.dependencies?.cloudinary);
  assert.ok(functionsPackage.dependencies?.["firebase-admin"]);
  assert.ok(functionsPackage.dependencies?.["firebase-functions"]);
});

test("Firestore ownership rules survived the repository move", () => {
  const rules = read("firestore.rules");

  assert.match(rules, /if isRoomMember\(roomCode\)/);
  assert.match(rules, /ownsCharacter\(resource\.data\)/);
  assert.match(rules, /isRoomDm\(roomCode\)/);
  assert.match(rules, /match \/monsters\/\{monsterId\}/);
  assert.match(rules, /validDmOwnedWrite\(roomCode\)/);
  assert.match(
    rules,
    /match \/\{document=\*\*\}[\s\S]*allow read, write: if false/
  );
});

test("the client uses the unsigned Cloudinary upload preset without browser secrets", () => {
  const app = read("app.js");
  const index = read("index.html");

  assert.match(app, /const uploadPreset = "homebrewgod_maps"/);
  assert.match(
    app,
    /api\.cloudinary\.com\/v1_1\/" \+ cloudName \+ "\/image\/upload/
  );
  assert.match(app, /new FormData\(\)/);
  assert.match(app, /formData\.append\("file", file\)/);
  assert.match(
    app,
    /formData\.append\("upload_preset", uploadPreset\)/
  );
  assert.doesNotMatch(app, /uploadCloudinaryImage/);
  assert.doesNotMatch(app, /CLOUDINARY_API_KEY/);
  assert.doesNotMatch(app, /CLOUDINARY_API_SECRET/);
  assert.doesNotMatch(app, /fileBase64/);
  assert.equal(
    app.match(/await uploadMapToCloudinary\(file\)/g)?.length,
    3,
    "battle-map and puzzle uploads use the shared unsigned uploader"
  );
  assert.match(app, /uploadImage: uploadMapToCloudinary/);
  assert.match(
    app,
    /uploadCharacterPortrait:[\s\S]*?return uploadMapToCloudinary\(file\)/
  );
  [
    "roomMapUploadInput",
    "uploadRoomMapButton",
    "puzzleTileUploadInput",
    "tokenImageUploadInput",
    "characterImageUploadInput"
  ].forEach((id) => {
    assert.match(index, new RegExp(`id=["']${id}["']`));
  });

  // Secure deletion remains a separate, authenticated operation.
  assert.match(
    app,
    /cloudfunctions\.net\/deleteCloudinaryAsset/
  );
  assert.match(
    app,
    /currentUser\.getIdToken\(\)/
  );
  assert.match(
    app,
    /"Authorization":\s*\n\s*"Bearer " \+ idToken/
  );
});

test("new room creation does not pre-read a room forbidden by membership rules", () => {
  const app = read("app.js");
  const createRoomSource = app.match(
    /async function createRoom\(\) \{[\s\S]*?\n\}/
  )?.[0] || "";

  assert.match(createRoomSource, /await setDoc\(roomRef,/);
  assert.doesNotMatch(createRoomSource, /transaction\.get\(roomRef\)/);
  assert.doesNotMatch(createRoomSource, /runTransaction\(db,/);
});

test("the optional Cloudinary deletion function retains ownership guards", () => {
  const functionsSource = read("functions/index.js");

  [
    "exports.deleteCloudinaryAsset",
    "verifyIdToken",
    "getRoomAccess",
    "isAssetReferenced",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET"
  ].forEach((contract) => {
    assert.ok(
      functionsSource.includes(contract),
      contract
    );
  });
  assert.match(
    functionsSource,
    /`homebrewgod\/\$\{roomCode\}`/
  );
  assert.match(
    functionsSource,
    /publicId\.startsWith\(\s*expectedPrefix/
  );
  assert.match(
    functionsSource,
    /cors: ALLOWED_ORIGINS/
  );
});

test("the Pages build preserves the non-mutating deployed service audit", () => {
  const build = read("scripts/build-pages.mjs");
  const securityPage = read(
    "tests/browser-pages/security-persistence-self-test.html"
  );
  const deployedTests = read("tests/deployed.spec.mjs");

  assert.match(build, /"firebase\.json"/);
  assert.match(build, /"firestore\.rules"/);
  assert.match(
    build,
    /path\.join\(root, "functions", "index\.js"\)/
  );
  assert.match(build, /"tests\/browser-pages"/);
  assert.match(securityPage, /\.\.\/\.\.\/app\.js/);
  assert.match(securityPage, /\.\.\/\.\.\/functions\/index\.js/);
  assert.match(securityPage, /\.\.\/\.\.\/firebase\.json/);
  assert.match(securityPage, /\.\.\/\.\.\/firestore\.rules/);
  assert.match(
    deployedTests,
    /tests\/browser-pages\/security-persistence-self-test\.html/
  );
});

test("GitHub requires tests before a main-branch Pages deployment", () => {
  const workflow = read(
    ".github/workflows/release-readiness.yml"
  );

  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /needs: test/);
  assert.match(
    workflow,
    /github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/
  );
  assert.match(workflow, /npm run test:ci/);
  assert.match(workflow, /npm run build:pages/);
  assert.match(workflow, /npm run test:deployed/);
});
