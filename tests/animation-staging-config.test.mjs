import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateAnimationStagingConfig, applyAnimationStagingConfig } from "../scripts/animation-staging-config.mjs";
const config = { environment: "staging", firebase: { apiKey: "public-test-key", projectId: "homebrew-animation-test", authDomain: "homebrew-animation-test.firebaseapp.com", appId: "test-app" }, cloudinary: { cloudName: "staging_cloud", uploadPreset: "staging_unsigned" } };
test("staging configuration refuses production Firebase, production upload preset, credentials and missing config", () => {
  assert.throws(() => validateAnimationStagingConfig({}), /staging explicitly/);
  assert.throws(() => validateAnimationStagingConfig({ ...config, firebase: { ...config.firebase, projectId: "homebrewgd" } }), /production Firebase/);
  assert.throws(() => validateAnimationStagingConfig({ ...config, firebase: { ...config.firebase, apiKey: "AIzaSyCT1IqS08HyXsP-o6pXJfYtz8p6BtM9Cb4" } }), /production Firebase/);
  assert.throws(() => validateAnimationStagingConfig({ ...config, firebase: { ...config.firebase, appId: "1:1067340395343:web:03ad344ced2aaa16c48b3a" } }), /production Firebase/);
  assert.throws(() => validateAnimationStagingConfig({ ...config, cloudinary: { cloudName: "dkezxpnl6", uploadPreset: "homebrewgod_maps" } }), /separate Cloudinary/);
  assert.throws(() => validateAnimationStagingConfig({ ...config, firebase: { ...config.firebase, private_key: "not-allowed" } }), /public Firebase/);
  assert.throws(() => validateAnimationStagingConfig({ ...config, password: "not-allowed" }), /credentials/);
  assert.throws(() => validateAnimationStagingConfig({ ...config, cloudinary: { ...config.cloudinary, api_secret: "not-allowed" } }), /public Firebase/);
});
test("staging transformation changes only generated service constants and disables the production deletion endpoint", () => {
  const source = readFileSync(new URL("../app.js", import.meta.url), "utf8"), staged = applyAnimationStagingConfig(source, config);
  assert.match(staged, /homebrew-animation-test/); assert.match(staged, /const cloudName = "staging_cloud"/);
  assert.match(staged, /const uploadPreset = "staging_unsigned"/); assert.match(staged, /const cloudinaryDeleteEndpoint = ""/);
  assert.doesNotMatch(staged, /us-central1-homebrewgd\.cloudfunctions\.net/);
  assert.match(source, /const uploadPreset = "homebrewgod_maps"/);
  assert.equal(staged.slice(staged.indexOf('const CLOUDINARY_DELETE_TOKEN_MAX_AGE_MS')), source.slice(source.indexOf('const CLOUDINARY_DELETE_TOKEN_MAX_AGE_MS')));
  assert.throws(() => applyAnimationStagingConfig(source.replace('const uploadPreset =', 'const missingPreset ='), config), /Source layout changed/);
  assert.equal(readFileSync(new URL("../app.js", import.meta.url), "utf8"), source);
});
