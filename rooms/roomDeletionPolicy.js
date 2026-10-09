export const ROOM_OWNED_COLLECTIONS = Object.freeze([
  { name: "players", clientCleanup: true },
  { name: "activePlayers", clientCleanup: true },
  { name: "maps", clientCleanup: true, collectsAssets: true },
  { name: "puzzleTiles", clientCleanup: true, collectsAssets: true },
  { name: "tokens", clientCleanup: true },
  { name: "characters", clientCleanup: true },
  { name: "monsters", clientCleanup: true },
  { name: "classes", clientCleanup: true },
  { name: "species", clientCleanup: true },
  { name: "backgrounds", clientCleanup: true },
  { name: "animations", clientCleanup: true },
  { name: "combatEffects", clientCleanup: true },
  { name: "effects", clientCleanup: true },
  { name: "sharedJournal", clientCleanup: true },
  {
    name: "personalJournal",
    clientCleanup: false,
    retainedReason: "Private player notes cannot be enumerated by a DM. After the room parent and memberships are removed, the rules make these records inaccessible."
  },
  { name: "dmJournal", clientCleanup: true },
  { name: "sharedDrawings", clientCleanup: true },
  { name: "dmDrawings", clientCleanup: true }
]);

export const ROOM_CLIENT_CLEANUP_COLLECTIONS = Object.freeze(
  ROOM_OWNED_COLLECTIONS.filter((entry) => entry.clientCleanup)
);

export const ROOM_RETAINED_PRIVATE_COLLECTIONS = Object.freeze(
  ROOM_OWNED_COLLECTIONS.filter((entry) => !entry.clientCleanup)
);

export function createRoomDeletionProgress(completedNames = [], options = {}) {
  const completed = new Set(completedNames);
  return {
    status: options.status || "in-progress",
    completedCollections: ROOM_CLIENT_CLEANUP_COLLECTIONS
      .map((entry) => entry.name)
      .filter((name) => completed.has(name)),
    remainingCollections: ROOM_CLIENT_CLEANUP_COLLECTIONS
      .map((entry) => entry.name)
      .filter((name) => !completed.has(name)),
    retainedPrivateCollections: ROOM_RETAINED_PRIVATE_COLLECTIONS
      .map((entry) => entry.name),
    failedCollection: String(options.failedCollection || ""),
    errorMessage: String(options.errorMessage || "").slice(0, 500),
    updatedAtMillis: Number(options.updatedAtMillis) || Date.now()
  };
}
