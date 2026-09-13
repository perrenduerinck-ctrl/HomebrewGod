# Animation organization and content ownership

Animation Library browses, searches, previews, remixes, edits and manages saved
visuals. Its All, Melee, Ranged, Magic, Favorites, My Animations and Recent tabs
are separate from Animation Creator's family-first authoring flow.

Melee, Ranged and Magic are metadata and templates over the existing player,
not new rendering engines. Magic subtype and elemental tags filter independently.
Legacy definitions derive their family without changing IDs, frame data or
hosted assets. Existing definitions do not require another upload.

## Saving spell appearance

Custom Spell Creator shows Cast, Travel, Impact, Sustain and End together, with
stage names, thumbnails, choose/create/upload/remix/preview/clear controls and
Preview Full Spell. Edit Spell reopens existing mechanics and stage references.
Save Spell updates the character draft; the existing character Save/Update Draft
persists the whole spell, including its animation references, to its owning room.
No global assignment save is required.

Signed-in content saves reject known temporary/session animation copies: save
the animation to My Animations first. This also catches references added before
login at the normal character save. Existing missing legacy refs are preserved
for safe fallback. Account-wide appearance cannot reference room-only definitions.

Built-in spell cards expose **Animations · account appearance**. The DM map
spell picker also exposes Spell Animations for its selected built-in spell.
Save Animation Setup persists only that spell's user appearance in
`users/{uid}.spellAnimationOverrides[spellId]` using a single mergeFields path.
The canonical catalog and other profile fields/setups remain unchanged.
Account appearances apply across rooms, clear from playback on logout or account
switch, and reload after login. An empty saved setup restores legacy visuals.
Existing owner-only user-document permissions already cover this store; no
Firestore rule expansion is needed.

Internal animation bindings remain a runtime mirror/testing mechanism. They are
not an authoritative saved content store or a user-facing global assignment form.

## Attack integration boundary

`contentAnimationModel.js` normalizes `attack.animation` with one Melee Attack
stage or Ranged Prepare → Projectile → Impact stages, and translates those to
the existing sequence's runtime stage keys. `openAttackAnimationPanel` reuses the
same stage chooser, preview, uploader and player and updates the attack draft.
Its host editor must perform its normal content save. This pass intentionally
does not add deep integration to every weapon.

`trackAttackAnimationReferences` reports a live attack's dependencies and returns
an unsubscribe function for hosts unloading their content editor. Replacements
edit the live attack and notify the host, preserving damage/range/mechanics.

## Deletion and failure safety

Known loaded custom-spell, attack and account-presentation references are reported
by the Library. A runtime mirror does not double-count its saved presentation.
Replacement updates live drafts; save affected characters and account appearance
setups to persist those edits. Account appearance replacements explicitly show a
pending-save warning. Other rooms/unopened content are not claimed to be verified.
Hosted assets are retained. Missing definitions/assets retain the existing safe
legacy VFX fallback, and a failed setup save retains the previous saved appearance.

## Verification

The new content model and browser tests cover normal spell save/reload/reopen,
editing mechanics without dropping refs, editing stages without dropping mechanics,
built-in reload/cast/account isolation, save failure, family filtering/templates,
all five magic stage controls, attack UI/model and accurate reference reporting.
The existing animation acceptance suite continues to test all five stages and
upload/save/reload/preview/cast/replacement. A checksum test protects the five
foundational animation modules from accidental changes in this UI pass.
