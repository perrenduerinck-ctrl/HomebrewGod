export const UNKNOWN_REMOTE_ANIMATION_WARNING = "This animation may also be referenced by saved spells in other rooms. Homebrew God cannot currently verify every remote room reference.";

export function getAnimationDeletionPolicy(animation, knownReferences = []) {
  const persistent = animation?.ownership?.kind === "user" &&
    ["user", "room"].includes(animation.ownership.scope);
  const libraryLabel = animation?.ownership?.scope === "room"
    ? "Room Library"
    : "My Library";
  const known = knownReferences.length
    ? `Known loaded references (${knownReferences.length}): ${knownReferences.map(ref => ref.name || ref.key).join(", ")}.`
    : "No references were found in the currently loaded reference tools. This is not a global dependency check.";
  return {
    persistent,
    confirm: persistent || knownReferences.length > 0,
    message: persistent
      ? `${UNKNOWN_REMOTE_ANIMATION_WARNING} ${known} Remove from ${libraryLabel} deletes the saved metadata and removes known loaded references only after sync succeeds. The hosted sprite is retained. Other saved references may need replacement or use safe fallback. Save affected content before removing metadata. Replace Known References keeps this animation in the library.`
      : `Session-only deletion does not delete a Firestore record or hosted sprite. ${known}`,
    removeLabel: persistent ? `Remove from ${libraryLabel}` : "Remove references and delete for session",
    replaceLabel: persistent ? "Replace Known References" : "Replace references and delete for session",
    canReplace: knownReferences.length > 0,
  };
}
