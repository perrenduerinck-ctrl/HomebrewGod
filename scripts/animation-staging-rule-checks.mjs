// Operator-run, real SDK checks. Copied only into the isolated staging artifact.
// No credentials, service-account keys, Admin SDK, emulator or transport mocks.
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, collection, getDocFromServer as getDoc, getDocsFromServer as getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { normalizeAnimation } from "../vfx/animationDefinition.js";

const prefix = "mergegate_rules_";
const fixtureId = /^mergegate_rules_[a-f0-9-]{36}$/;
const validUid = value => typeof value === "string" && value.length <= 128 && !value.includes("/") && value.trim().length > 0;
async function context(confirmProjectId) {
  const response = await fetch(new URL("../animation-staging.json", import.meta.url), { cache: "no-store" });
  if (!response.ok) throw new Error("Staging marker missing. Do not run these checks on production.");
  const metadata = await response.json(), config = metadata.firebase;
  if (metadata.environment !== "staging" || metadata.workingTreeDirty || config?.projectId === "homebrewgd" || confirmProjectId !== config?.projectId) throw new Error("Use a clean, authorized staging build and explicitly confirm its Firebase project ID.");
  const app = getApps().find(item => item.options.projectId === config.projectId) || initializeApp(config);
  const auth = getAuth(app); await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error("Sign in with a real staging test account first; do not share its password or token.");
  const token = await user.getIdTokenResult();
  if (token.claims.aud !== config.projectId) throw new Error("Auth token belongs to a different project. No Firestore checks were run.");
  return { db: getFirestore(app), uid: user.uid, sourceCommit: metadata.sourceCommit, projectId: config.projectId };
}
function hostedSprite(spriteUrl) {
  if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\//.test(spriteUrl || "")) throw new Error("Supply the real HTTPS Cloudinary sprite URL from your staging Gary Missile upload.");
}
async function denied(label, work, results) {
  try { await work(); }
  catch (error) {
    if (error.code === "permission-denied" || error.code === "firestore/permission-denied") { results.push({ check: label, result: "PASS" }); return; }
    throw new Error(`${label}: not a verified rules denial (${error.code || error.message}).`);
  }
  throw new Error(`${label}: FAIL — Firestore unexpectedly allowed the operation. Only reserved staging fixture records are targeted.`);
}
export async function runOwnAnimationRuleChecks({ confirmProjectId, spriteUrl, otherUid, retainFixture = false } = {}) {
  hostedSprite(spriteUrl);
  const c = await context(confirmProjectId);
  if (!validUid(otherUid) || otherUid === c.uid) throw new Error("Supply the second staging test user's UID for ownership-spoofing checks.");
  const id = prefix + crypto.randomUUID(), reference = doc(c.db, "users", c.uid, "animations", id), results = [];
  const definition = normalizeAnimation({ id, name: "Reserved animation rule fixture", sprite: spriteUrl, grid: { columns: 6, rows: 6 }, frameCount: 36, fps: 30, behavior: "projectile", ownership: { kind: "user", scope: "user", ownerId: c.uid } });
  const record = { ...JSON.parse(JSON.stringify(definition)), ownerId: c.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  const spoofId = prefix + crypto.randomUUID(), spoofReference = doc(c.db, "users", c.uid, "animations", spoofId);
  let created = false, spoofCreated = false, complete = false;
  try {
    await setDoc(reference, record); created = true; results.push({ check: "own create", result: "PASS" });
    const snapshot = await getDoc(reference), saved = snapshot.data();
    if (!snapshot.exists() || saved.id !== id || saved.ownerId !== c.uid || saved.ownership?.ownerId !== c.uid || /data:image|base64|blob:/.test(JSON.stringify(saved))) throw new Error("Saved record identity/ownership/transient-media inspection failed.");
    results.push({ check: "own read and saved record inspection", result: "PASS" });
    await getDocs(collection(c.db, "users", c.uid, "animations")); results.push({ check: "own collection read", result: "PASS" });
    await updateDoc(reference, { fps: 31, revision: 2, updatedAt: serverTimestamp() });
    if ((await getDoc(reference)).data().fps !== 31) throw new Error("Own update did not survive a server read.");
    results.push({ check: "own update", result: "PASS" });
    await denied("spoof top-level owner", () => updateDoc(reference, { ownerId: otherUid }), results);
    await denied("change nested ownership", () => updateDoc(reference, { ownership: { kind: "user", scope: "user", ownerId: otherUid } }), results);
    await denied("create with another owner's identity", async () => { await setDoc(spoofReference, { ...record, id: spoofId, ownerId: otherUid, ownership: { kind: "user", scope: "user", ownerId: otherUid } }); spoofCreated = true; }, results);
    complete = true;
  } finally {
    if (spoofCreated) await deleteDoc(spoofReference);
    if (created && (!retainFixture || !complete)) { await deleteDoc(reference); results.push({ check: "own delete / fixture cleanup", result: "PASS" }); }
  }
  return { ...c, db: undefined, animationId: id, retainedFixture: retainFixture && complete, results };
}
export async function runPeerAnimationRuleChecks({ confirmProjectId, peerUid, animationId } = {}) {
  const c = await context(confirmProjectId);
  if (!validUid(peerUid) || peerUid === c.uid || !fixtureId.test(String(animationId))) throw new Error("Use a different test user's reserved mergegate_rules_ fixture, never a real spell asset.");
  const reference = doc(c.db, "users", peerUid, "animations", animationId), results = [];
  await denied("other-user record read", () => getDoc(reference), results);
  await denied("other-user collection read", () => getDocs(collection(c.db, "users", peerUid, "animations")), results);
  await denied("other-user update", () => updateDoc(reference, { name: "Reserved denied-write probe" }), results);
  await denied("other-user delete", () => deleteDoc(reference), results);
  return { uid: c.uid, projectId: c.projectId, sourceCommit: c.sourceCommit, results };
}
export async function cleanupOwnRuleFixture({ confirmProjectId, animationId } = {}) {
  const c = await context(confirmProjectId);
  if (!fixtureId.test(String(animationId))) throw new Error("Cleanup is restricted to reserved rule-check fixture IDs.");
  await deleteDoc(doc(c.db, "users", c.uid, "animations", animationId));
  return { result: "Own staging fixture removed. No hosted sprite was deleted." };
}
