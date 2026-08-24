# Safe Reorganization Workflow

Repository moves must be behavior-preserving and reviewable. A structural change is complete only when its imports, tests, deployment artifact, and external-service boundaries still work.

## Scope each checkpoint

1. Move one subsystem or one coherent file group at a time.
2. Do not combine a structural move with a performance rewrite or gameplay change.
3. Record the starting branch and keep unrelated working-tree changes untouched.
4. Update every import, browser URL, audit path, and test reference immediately after the move.
5. Commit only after that checkpoint passes its focused tests.

The Character Creator, Character Sheet, Monster Creator, token system, shared services, game data, tests, documentation, and assets now have explicit homes. The Battle Map remains in `app.js` until it can be extracted as its own behavior-preserving subsystem; it must not be moved piecemeal while it shares room lifecycle and realtime state with the application shell.

## Required gates after every move

Run the smallest relevant focused test first, followed by all release gates before merge:

```text
npm run check:syntax
npm run check:imports
npm run validate:data
npm run audit:phases
npm run test:unit
npm run build:pages
```

GitHub Actions must then pass the Chromium browser suite on the branch. After merge, the main-branch run must build GitHub Pages and pass the deployed-site checks.

## GitHub Pages paths

- Runtime folders required by `index.html` or `app.js` must be copied by `scripts/build-pages.mjs`.
- Browser self-tests remain under `tests/browser-pages/` and are copied into the same path in the Pages artifact.
- Cache keys must change when an entry point moves so returning browsers do not request retired URLs.
- Old deployed entry-point paths must not remain in the import map or application shell.

## Firebase and Cloudinary boundaries

Structural work must preserve all of the following:

- `firebase.json` points to `firestore.rules` and the `functions/` source directory.
- Firestore retains its deny-by-default fallback and room ownership checks.
- The client uses only the authenticated `uploadCloudinaryImage` and `deleteCloudinaryAsset` endpoints for managed uploads and deletion.
- Cloudinary requests carry a Firebase ID token.
- Server functions verify the ID token, room membership, asset ownership, MIME signature, size limit, and managed room folder.
- `functions/index.js`, `firebase.json`, and `firestore.rules` remain available to the deployed security audit page.

The automated `tests/reorganization-safety.test.mjs` contract protects these paths and service boundaries. The browser-facing security suite provides the final deployed verification without sending a real upload or mutating production data.

## Commit and review rules

- Use an `[AI]` prefix for AI-created checkpoint, pull-request, and merge titles.
- Keep checkpoints small enough that moved files and path repairs can be reviewed together.
- Never bypass failing release or deployed-site checks.
- Do not deploy Firebase functions or rules merely because application files moved; production service deployment requires its own explicit, reviewed change.
