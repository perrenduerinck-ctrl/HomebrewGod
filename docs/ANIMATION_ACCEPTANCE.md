# Animation acceptance and fix pass

Branch: `ai/spell-preview-persistent-animations`. Main and production deployment
remain unchanged. This is an automated acceptance/fix pass, not a claim that the
production Firebase rules, Cloudinary preset, audio device, or live account have
passed acceptance.

## Test environment

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

Delete safety covers tracked references and the current room's authoritative saved
spells, not all unopened rooms or simultaneous remote edits. Hosted files are
intentionally retained because safe orphan cleanup needs server-side reference
checking. Do not treat this as global cross-room deletion safety. If global safety
is required before merge, that needs a dependency-index/backend decision rather
than a cosmetic client-only workaround.

The provided final checklist ends at “34. Move/pan/resi”; pan and resize are covered
above, but no missing continuation is assumed. Until the live checks pass, this
branch should remain unmerged and should not be declared production-ready.
