# Animation staging merge gate

Branch: `ai/spell-preview-persistent-animations`. This guide prepares live checks;
it does not say they passed. No production deployment or rules change is included.
Use a disposable checkout, never the user's existing local project. Do not merge
main or start the next animation-builder feature.

## Isolated artifact

An operator must provide an authorized staging origin, a **separate Firebase
project** with real Auth/Firestore, two non-anonymous test accounts, and an
authorized Cloudinary unsigned staging preset. The preset must restrict uploads
to the intended staging folder/formats/size. A different preset in the same cloud
is allowed only with explicit staging authorization. Do not reuse the production
upload preset. Add the staging origin to Firebase Auth's authorized domains.

Copy `docs/examples/animation-staging.example.json` to an operator-owned file and
replace its placeholders with public Firebase web configuration and the unsigned
cloud/preset names. Never put passwords, service-account files, access tokens,
Cloudinary API secrets or private keys in this JSON or the repository.

From a clean, committed disposable checkout:

```powershell
$env:HOMEBREW_ANIMATION_STAGING_CONFIG = 'C:\operator\animation-staging.json'
npm run test:animation-staging
npm run build:animation-staging
Remove-Item Env:HOMEBREW_ANIMATION_STAGING_CONFIG
```

`node --run` can replace `npm run` on a host without npm. A non-PATH Git binary
can be supplied through `HOMEBREW_STAGING_GIT_EXECUTABLE`. The output is
`dist-staging/`, not `dist/`; only generated service constants are changed.
Production `app.js` and the normal Pages workflow remain unchanged. The staging
artifact disables the production Cloudinary deletion endpoint and displays a
STAGING badge. `animation-staging.json` records the source SHA, project and whether
tracked or untracked changes were present. A dirty build is not accepted by the rule checker.
Rebuild after committing fixes. This build command does not deploy anything.

Publish **only this artifact** to the explicitly authorized preview host; do not
run the repository's production Firebase deployment commands or deploy the copied
Cloud Function. Inspect the marker, browser Firebase requests and Cloudinary
preset before signing in or writing test data. Record the preview URL/source SHA.
The example JSON is intentionally unusable for live acceptance.

The staging project must have the intended animation rules actually deployed by
an authorized operator. Verify their contents rather than assuming a copied
`firestore.rules` has been deployed. If changes are necessary, stop and obtain
authorization; the user's designated `C:\Users\perre\OneDrive\Desktop\ai test\Firebase.js`
is the source for **all** Firebase rule changes. This merge-gate pass does not
modify that file, deploy rules or weaken ownership checks.

## Real Gary Missile workflow

Run in a normal, audible browser with no Playwright transport mocks. Keep DevTools
Network/Console open. Record actual results, requests, stable IDs and screenshots
without passwords/tokens. Use test-only rooms/characters/assets.

1. Sign in as real User A. Open Animation Creator and upload a transparent 6×6
   sprite named **Gary Missile**. Set grid/frames/FPS/playback/behavior/placement/
   native direction/pivot/anchor/tint/scale/opacity deliberately. Save.
2. Inspect the actual Cloudinary upload: image endpoint, unsigned preset,
   `secure_url` HTTPS, `public_id`, `resource_type: image`. Open the returned image.
3. Inspect the **server** record `users/{uid}/animations/{animationId}`. Record ID,
   both owner identities/scope, URL, grid, frames, FPS, playback, behavior, placement,
   direction, appearance, revision, createdAt/updatedAt and asset identity. Confirm
   no `data:image`, `base64`, `blob:`, DOM objects, preview fields or binary payload.
4. Assign Gary Missile to a custom spell's Travel and add an Impact. Save the spell
   and its owning character. Record the exact Travel/Impact IDs from the saved data.
5. Fully reload the browser page, not just the modal. Confirm real Firestore loads,
   real Cloudinary image loads and the saved spell still contains those exact IDs.
6. At 100% zoom, click caster then target in Battle Map Preview; observe Source at
   the caster body's center and Target at the target body's center or selected
   map point. Projectile must reach Target; Impact must occur there. Repeat actual
   Confirm Cast and compare. Test token and map-point targeting.
7. Repeat Preview and actual Cast at 150%, then resize the browser/map and repeat.
   Include one elevated target and a Large or Huge token. Do not measure token
   label/shadow bounds instead of the rendered token body.
8. Replace Gary Missile's sprite, Save, verify its Animation ID is unchanged and
   revision advances. Fully reload; confirm new HTTPS artwork is loaded and the
   same saved spell still previews/casts using that ID.
9. Reload again and check personal animations and saved spell assignments. Library
   favorites/recent usage and direct test-action bindings are document/session
   state, not durable personal preferences. Saved custom spell stages/overrides
   persist through the existing character save path. Unsaved edits do not.
10. Sign out A, sign in B: neither A's saved animation nor A-owned unsaved remixes
    may appear. Sign out B, sign in A: A's saved definition returns. Repeat with a
    full page reload. Do not treat a mocked auth switch as this live result.

## Real deployed-rule probes

`staging/rule-checks.mjs` uses the real Firebase web SDK, server-only reads and the
current real test user's Auth token. It refuses production/missing/dirty markers
and mismatched Auth project identities. Network errors are not successful rule
denials. No Admin SDK, emulator, rule deployment or hosted-file deletion is used.
Run these only after the staging origin/project is explicitly authorized. All
mutating probes target uniquely named `mergegate_rules_` fixture documents, never
Gary's real ID. If a broken rule allows a peer deletion, only that reserved fixture
is affected. Keep the fixture IDs for cleanup if a network failure interrupts it.

Sign in A in the app, then in the browser console:

```javascript
const checks = await import(new URL('./staging/rule-checks.mjs', location.href));
const a = await checks.runOwnAnimationRuleChecks({
  confirmProjectId: 'YOUR_ACTUAL_STAGING_PROJECT',
  spriteUrl: 'YOUR_ACTUAL_HTTPS_CLOUDINARY_GARY_URL',
  otherUid: 'USER_B_UID', retainFixture: true
});
console.table(a.results); // retain a.uid and a.animationId, not an Auth token
```

Own create/server-read/list/update must pass; spoofed owner create, top-level owner
change and nested ownership change must be `permission-denied`. In B's signed-in
browser context, import the same module and run:

```javascript
const b = await checks.runPeerAnimationRuleChecks({
  confirmProjectId: 'YOUR_ACTUAL_STAGING_PROJECT',
  peerUid: 'USER_A_UID', animationId: 'A_RETURNED_RESERVED_FIXTURE_ID'
});
console.table(b.results);
```

Other-user record/list reads, update and delete must be denied. Sign back into A
and run `cleanupOwnRuleFixture({confirmProjectId, animationId: a.animationId})`;
verify deletion with a server read. Also run own probes with `retainFixture:false`
to record own DELETE. Preserve actual outputs/errors; a partial run is NOT VERIFIED.
Never substitute stubbed SDK responses to make this section green.

## Cloudinary failures and conservative deletion

Record which PNG/WebP/JPEG formats the actual preset accepts and its configured
size limit. The application currently permits up to 8 MiB, 16,384 pixels per side
and 64 megapixels; these are client limits, not a claim about the provider preset.
Test valid files, invalid bytes with an image MIME, a non-image format, an oversize
file and an over-dimension sprite. Decode errors must appear before save.

On staging only, block the upload request or interrupt networking during Save;
also exercise a preset rejection (an operator-owned restrictive staging preset,
not production configuration). Restore connectivity afterward. A readable error
must appear; inspect Firestore from the server to ensure there is no animation
pointing to a transient URL and no successful-looking local replacement. An
upload may succeed before a later Firestore failure: retain that hosted asset
rather than claim global orphan safety.

Persistent Delete must always show the exact unknown-remote-reference warning,
even when no loaded references were found. Verify Cancel writes nothing; Replace
Known References changes only loaded bindings/drafts and keeps metadata/sprite;
save affected characters explicitly. Remove from My Library deletes metadata
only after allowed remote deletion and retains the hosted sprite. Current-room
saved spell dependencies must still block unsafe metadata deletion. Session-only
Delete must not write Firestore or delete a hosted file. Verify failures preserve
the old definition/references. Do not claim all other rooms were checked.

Use a test spell with a deliberately missing record/asset: warning and legacy
fallback must preserve gameplay, with replacement and reference clearing still
available. No server-wide dependency index or soft-delete migration is added.

## Artwork, audio and sustained live session

Inspect actual frames for alpha/opaque borders, native source direction, pivot,
anchor, tint, scale, opacity, projectile facing, melee placement, beam thickness,
healing position, aura center and fixed ground position. Repeat at 100%/150%, a
resized map, elevation and Large/Huge token. Compare a second known-good sprite
before attributing a bad asset to renderer math. Save screenshots and settings.

With an actual playable HTTPS sound and sound enabled, exercise Play, Pause,
Resume, Stop, Replay, Effects Off, sound toggle, close preview and switch spell.
No orphan/overlapping/stuck audio may remain. Also test browser autoplay refusal:
visuals/gameplay must continue. Headless `--mute-audio` or fake Audio proves none
of this live device behavior.

Run at least 15 minutes of repeated casts/previews, token moves, target changes,
zoom/resize, spell switches, melee and aura start/stop. Capture idle baselines and
5/10/15-minute post-cleanup samples: `.hg-map-vfx-effect` count, active player
instances/sequences, audio instances, console errors, heap snapshots if available,
and Performance frame/GPU traces if available. No upward retained-effect trend or
stuck sound is acceptable. If diagnostic hooks are unavailable in that deployment,
record that fact rather than reporting zero. Stop all effects and check cleanup
again. Short automated stress checks do not replace this live session.

Update `ANIMATION_ACCEPTANCE.md` with actual source SHA and evidence for every live
area. Keep unperformed checks **NOT VERIFIED**. No merge recommendation may become
positive until the required real-service and live-session checks have passed.
