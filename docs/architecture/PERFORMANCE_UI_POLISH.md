# Performance and UI Polish

Stage 7 is a measured quality pass over existing systems. It does not replace
the Battle Map, creator, listener, or visual-style architectures.

## Realtime lifecycle

- Firestore subscriptions continue through the shared realtime-listener
  registry, which reuses identical scopes, stops obsolete scopes, and rejects
  late callbacks.
- Leaving a room stops room, token, Fog of War, vision, drawing, object,
  puzzle, creator, and combat listeners through their existing cleanup paths.
- Stable map elements retain their existing event handlers, so repeated
  snapshots do not attach duplicate handlers.

## Bounded rendering

- Tokens and interactive objects are reconciled by stable ID and a render key.
  An unchanged snapshot reuses every element; changing one record replaces
  only that record.
- Public and DM-only token snapshots are coalesced into one animation-frame
  render when they arrive together.
- Fog of War separates control state from mask content. Changing paint mode,
  shape, preview mode, or toolbar state does not rebuild an unchanged SVG mask.
- Gameplay effects maintain a target-token index. Token badges no longer scan
  and clone the entire room effect collection once per token.
- Visible effect badges remain capped at three plus a summary badge per token.

## Interaction and usability

- Inactive Fog, vision, drawing, and template overlays yield pointer events to
  tokens and map controls.
- The hotbar and token context menu retain their bounded desktop/mobile
  behavior and descriptive action tooltips.
- Empty Battle Map messages now tell a DM where to choose a map and tell a
  player when they are waiting for the DM.
- Complex Fog and object-placement controls include concise native tooltips.
- Shared visual tokens, empty/error states, focus styles, and responsive
  breakpoints remain the source of truth; no feature-specific redesign was
  introduced.

## Performance budgets

The Stage 7 browser gate verifies:

- 100 visible tokens render within 1.5 seconds and a one-token update within
  300 milliseconds.
- An unchanged 100-token update retains all 100 DOM elements; a one-token
  change retains 99.
- 500 active effects across 100 tokens render within 1.5 seconds and produce
  no more than four visible badges per token.
- 100 interactive objects render within one second and a one-object update
  within 250 milliseconds while retaining the other 99 elements.
- Fog toolbar-only changes reuse the current mask.
- Phone, tablet/laptop, Character Creator, hotbar, context-menu, object-editor,
  and shared visual-system regressions remain covered.

Run the focused gates with:

```text
pnpm run test:stage7
pnpm run test:stage7:browser
```
