# Animation acceptance and final merge gate

Branch: `ai/spell-preview-persistent-animations`. Main and production deployment
remain unchanged. This is an automated acceptance/fix pass, not a claim that the
production Firebase rules, Cloudinary preset, audio device, or live account have
passed acceptance.

## Final merge-gate record — 2026-09-12

- Branch: `ai/spell-preview-persistent-animations`.
- Starting known-good SHA: `90df692ac1fb91d91fa091e56de450ac8bff91d3`.
- Tested implementation SHA: `5d1273aad0b4f4aa64ea0d8a6c6bf702d6833c5b`.
  This report is a subsequent documentation-only commit; the implementation SHA
  identifies the application, tests and staging scripts actually checked.
- Main remained `0d8a7abc883c445aa58397ce95203f5dd004a524` when checked. No merge,
  production deployment, Firebase rule change or Cloudinary destruction was run.
- Work used a disposable checkout, not the user's existing local project.
  The designated local `Firebase.js` was not edited.

### AUTOMATED ACCEPTANCE

All targeted local suites passed. Headless Microsoft Edge/Playwright ran the
production application code with test-only Firebase/Auth/Cloudinary transport
responses where specified. This is not real-service acceptance or a full CI claim.

| Final run | Result |
| --- | --- |
| Full `test:unit` | PASS, including spell preview, casting session/sequence and persistence |
| Full `test:vfx-fire` | PASS, including animation/runtime, 23 persistence, 18 preview-unification and 4 new deletion/account-visibility checks |
| Full `test:movement` | PASS, 14 checks |
| `test:animation-staging` | PASS, 2 checks: production/credential rejection and isolated generated-config transformation |
| Animation acceptance/runtime/editor, replacements and combat browser specs | PASS, 30 checks in one combined run; acceptance spec now has 14 checks |
| Targeted legacy preview/casting/targeting/elevation/VFX and movement browser regressions | PASS, 9 checks in one combined run |
| Syntax/import graph | PASS, 245 JS/mJS files; 677 local imports across 260 source files |
| Data validation and phase audit | PASS; all 20 phase audits |
| Normal Pages and isolated staging artifacts | PASS; placeholder configuration only, neither deployed |
| GitHub full CI | NOT VERIFIED; local targeted results do not establish remote CI completion |

The nine browser regressions cover structured spell geometry; the three DM Spell
Preview workflows; linked-token Confirm Cast exactly once; true elevation-aware
range; VFX alignment/modes/cleanup; and the two movement browser checks. No existing
tests were removed or weakened. Browser service doubles do not assert real deployed
rule enforcement. The new account-switch check drives the app's real Auth callbacks
with mocked account identities, not real Firebase login credentials.

Screenshot inspection of the actual repository artwork covered the map sword
slash, paused advanced projectile preview, and the seven replacement sheets on a
white background. No opaque sheet rectangle or new obvious cell-border regression
was observed in those samples. These bounded local screenshots do not verify the
requested complete live artwork matrix or a newly uploaded Gary asset. Existing
Full/Reduced/Off and fake-Audio cleanup assertions remained green; audible sound,
real browser autoplay and long-session hardware behavior are not established.

### Changes made in this merge gate

- Persistent deletion always shows: "This animation may also be referenced by
  saved spells in other rooms. Homebrew God cannot currently verify every remote
  room reference." This applies even when zero loaded references were found.
- Choices are Cancel, Remove from My Library and Replace Known References.
  Cancel writes nothing. Replace changes only known loaded references and keeps
  the definition, Firestore metadata and hosted sprite; affected characters must
  be saved. Remove deletes metadata only after remote/application checks succeed,
  then updates loaded references. Hosted sprites are retained. Existing saved
  current-room spell guards and failed-delete preservation remain in place.
- Session-only deletion is explicitly separate: it does not delete persistent
  metadata or a hosted sprite. Neither choice claims global dependency knowledge.
- No soft-delete migration was introduced: hiding/archive resolution would add a
  second lifecycle and schema/rules work. The task explicitly permits retaining
  metadata deletion with hosted retention and an honest remote warning. Unopened
  room references can need manual replacement or existing safe legacy fallback.
- Account-owned unsaved session remixes are now hidden from other accounts as
  well as persistent definitions. A → B → A restores only the owner's private items.
- `build:animation-staging` produces a distinct `dist-staging/` with an explicit
  public staging config, production config/preset guards, source/dirty marker,
  STAGING badge and disabled production deletion endpoint. Normal `app.js` source
  and normal Pages artifact bytes remain unchanged.
- Operator-run real SDK ownership probes and the complete live Gary/failure/
  artwork/audio/long-session checklist are prepared in [ANIMATION_STAGING.md](ANIMATION_STAGING.md).
  The probes require a clean staging marker, matching real Auth project and
  server-only Firestore reads. They were not run against a real service here.

### LIVE ACCEPTANCE

No authorized staging URL, real staging configuration or two signed-in real test
accounts were supplied/verified for this pass. No production account was used as
a substitute. The following checks are prepared, **not passed**:

| Required live area | Result / missing evidence |
| --- | --- |
| Real Firebase Auth and animation create/read/update/delete | NOT VERIFIED — actual staging operations needed |
| Deployed Firestore rules: own CRUD, peer read/list/update/delete denial, owner spoof/create/change denial | NOT VERIFIED — two real accounts and actual deployed-rule probe outputs needed |
| Real unsigned Cloudinary upload | NOT VERIFIED — preset formats/limits, HTTPS secure_url, public_id and image resource_type needed |
| Upload failures, network interruption, invalid/oversize/over-dimension image and no transient Firestore write | NOT VERIFIED — real error/network/server-record evidence needed |
| Live Gary Missile saved spell → full reload → Preview and Confirm Cast → stable-ID sprite replacement → reload | NOT VERIFIED — actual Firestore/Cloudinary workflow needed |
| Actual Gary record identity/owner/scope/settings/revision/timestamps and no embedded/transient fields | NOT VERIFIED — server record inspection needed |
| Source/Target and Preview/Cast at 100%/150%, resize, elevation, Large/Huge token | NOT VERIFIED — complete live alignment/artwork matrix needed |
| Real Play/Pause/Resume/Stop/Replay/Off/toggle/close/switch and autoplay refusal | NOT VERIFIED — audible-device lifecycle check needed |
| Sustained live casts/previews/movement/targets/zoom/resize/melee/aura cleanup | NOT VERIFIED — long-session DOM/instances/sequences/audio/console and available memory/render samples needed |
| Real logout/login A → B → A and whole-app reload isolation | NOT VERIFIED — live account-switch evidence needed |
| Live deletion choices and missing remote record/asset safe gameplay fallback | NOT VERIFIED — real-service safety/failure evidence needed |

### Merge recommendation

NOT READY TO MERGE

Exact blockers: an authorized real-service staging environment and two test
accounts have not been verified; real Firebase CRUD/record inspection/ownership
rules and Cloudinary uploads/failures have no live evidence; the complete live
Gary save/reload/cast/replace workflow and account switching are unverified; and
the requested live artwork, real sound and sustained-session leak/console checks
remain unperformed. Complete and record those checks before reconsidering merge.
Unknown remote references remain an explicit limitation, handled conservatively
by warning, retained hosted assets and fallback—not a claimed global index.

## Previous automated acceptance pass (starting SHA 90df692)

### Test environment

The existing application runs from a disposable checkout in headless Microsoft
Edge through Playwright. `tests/helpers/animation-services.mjs` replaces only the
Firebase SDK transport/auth response and Cloudinary HTTP responses. The production
creator, upload client, persistence code, character save/reload path, library,
spell adapters, sequence, player, runtime, renderer, and token system run normally.
The test service keeps records across full page reloads in test-only localStorage;
this is not an application localStorage persistence workaround. Uploads return
distinct HTTPS asset identities and serve a valid repository 6×6 PNG sheet.

One test serves the same app bytes through a browser-routed HTTPS test origin to
exercise built-in relative URL resolution. No production account is written.
Audio lifecycle tests substitute an Audio object; they verify cleanup, not sound
quality, audibility, or browser autoplay permission. Page and console errors are checked in
the authoring and continuous acceptance workflows. Expected simulated offline/
asset failures are deliberately surfaced as readable warnings.

## Fixes found through behavioral checks

- Query-string differences created two Animation Workspace module instances.
  Creator and spell panel now share one canonical session.
- Confirmed cone/line casts used the caster geometry anchor as Target; self
  direction and explicit null map targets now survive the event boundary.
  Single-target selection geometry no longer changes a projectile into AOE VFX.
- Border offsets displaced the VFX/template overlay; both layers now align to
  the same map origin. Fast projectiles sample their exact terminal runtime
  position before natural completion rather than stopping at the last RAF sample.
- Failed sync could leave a successful-looking local edit or cleared references.
  Save/delete now validate and finish remote work before local mutation, preserve
  stable IDs, prevent duplicate submits, and protect saved current-room spells.
- Built-in remixes had relative asset URLs; persistence now resolves secure URLs
  and rejects insecure sprite/sound payloads. Stale account work cannot publish
  another user's ready/error status or assign their animation.
- Cached sync success hid offline failure; failed loads now invalidate that cache.
  Failed/hung sprite requests warn, mark the asset unavailable, time out, retry,
  and release pending loads during disposal. Safe fallback remains cosmetic only.
- Override UI overwrote inherited tint/flips/offsets and retained cleared nested
  values. Only changed controls become overrides; other nested data stays intact.
  Placement/direction choices now use supported runtime names.
- Preview distance changed the grid scale instead of actor separation. The shared
  stage now retains a fixed 150-ft scale and moves Source/Target for each preset.
- Saved custom spells were absent from the map preview picker. It now reuses the
  existing character library/draft, without a second spell store. Their plain
  saved range/area fields now derive catalog targeting at the shared preview/cast
  boundary; explicit targeting stays authoritative and unknown ranges still fail.

## Behavioral coverage

| Acceptance area | Evidence |
| --- | --- |
| Create, save, full reload, edit, replacement | Actual creator controls, 6×6 file upload, HTTPS/no-data Firestore payload, FPS/scale and stable ID/revision assertions |
| Saved spell stages and overrides | Actual character Save Draft; all five stage IDs survive full reload; 14 overrides affect prepared playback without changing the base |
| Continuous Gary workflow | Upload → save → Travel assignment + built-in Impact → saved character → map preview/replay → Confirm Cast → full reload → repeat → replace same ID → preview/cast at 150% |
| Every slot's authoring controls | Choose, Replace, Preview, Clear, Create New, Upload New, built-in Remix for Cast/Travel/Impact/Sustain/End |
| Source/Target and map transforms | Real rendered Medium/Large/Huge token bodies, six zooms, 72 center comparisons, pan/resize and four elevation pairs |
| Direction, motion and behavior | Eight projectile directions × four native artwork facings; 24 real-token sword/spear/claw direction/offset samples; real-token self/heal, following aura/heal/beam and fixed ground pan/resize checks; existing beam/sprite dimensions tests |
| Preview versus confirmed cast | Production preview and Confirm Cast boundaries for Fireball, cone, line and saved custom projectile; map point and token target assertions |
| Stop, sustain, modes and sound | Two-second preview Sustain → End; 20 rapid stop/replays with changing target; Full/Reduced/Off; no remaining effect DOM/instances/sequences and disposed fake audio |
| Missing assets/offline and delete | Abort hosted image, missing ID and Firestore load/write/delete failure; readable fallback, unchanged old definition/references, built-in protection and current-room dependency warning |
| Shared preview stage | Actual drag, keyboard, Swap, Reset, distance separation and resize tests, alongside the retained unification unit suite |

The added acceptance spec runs in the regular browser/CI script. Existing
persistence and preview-unification tests remain, with behavioral regressions
added rather than removed. The VFX asset-cache unit suite also checks timeout and
pending-load disposal. Syntax/import/data/phase checks, the full unit/VFX unit
suites, movement units, animation/combat/replacement browser suites, and targeted
spell-preview/casting/range/map/movement browser regressions are part of this pass.

## Recorded validation

Recorded local results for this pass:

- 37 distinct relevant browser checks passed across staged runs: 28 animation/
  combat/replacement checks and nine spell-preview/casting/map/movement checks.
  Twelve browser acceptance tests are new. The 27-test combined animation run
  passed, then the added real-token behavior check passed separately; affected
  save/delete and map regressions were rerun against the final implementation.
- Full `test:unit`, `test:vfx-fire` and `test:movement` suites passed. Persistence
  now has 23 checks, preview unification 18 and VFX clips 16; existing checks remain.
- Syntax passed for 239 JS files; imports passed for 665 local references across
  254 source files. Data validation and all 20 phase audits passed. The Pages
  artifact build passed; it was not deployed.
- These are local results, not a claim that the full GitHub CI/browser suite or
  live service acceptance has passed. No merge or rule deployment was performed.

## Before merge: required live checks

1. Deploy this branch to an authorized staging/preview environment, not main.
2. Sign in with a real user and perform the attachment's full Gary Missile
   workflow against actual Firestore and Cloudinary, including full reload and
   replacing the sprite while keeping its ID. Inspect real writes for HTTPS URLs,
   correct owner paths, settings/revision preservation and no embedded media.
3. Verify the deployed owner-only Firestore animation rules and configured
   Cloudinary unsigned upload preset. This pass does not deploy or rewrite rules.
   The user's designated local `Firebase.js` remains the source for any future
   Firebase rule changes; it was not modified during this pass.
4. Inspect real artwork visually for native direction, anchor, alpha, tint,
   melee/beam thickness and healing/aura/ground presentation across pan, resize,
   elevation and the requested zoom levels. Check real audio/play/pause/stop and
   effect/sound toggles on the intended device.
5. Repeat stress with live actor movement, spell changes and zoom; inspect console,
   performance and memory over a longer session. Automated bounded cleanup is
   covered, but long-session GPU/audio/network behavior has not been measured.

Those historical live prerequisites remain unverified. The final merge-gate
sections above supersede the previous deletion-policy notes and checklist.
