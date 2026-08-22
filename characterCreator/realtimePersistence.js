export function readRealtimeSnapshotRecords(
  snapshot
) {
  const docs = Array.isArray(snapshot?.docs)
    ? snapshot.docs
    : [];

  return docs.map((documentSnapshot) => {
    const data =
      typeof documentSnapshot.data ===
        "function"
        ? documentSnapshot.data()
        : {};
    const docId = String(
      documentSnapshot.id ||
      data?.docId ||
      data?.id ||
      ""
    );

    return {
      ...(data || {}),
      id: data?.id || docId,
      docId
    };
  });
}

export function createCharacterRealtimePersistence({
  deps,
  listeners,
  getRoomCode,
  hasFirestoreTools,
  getState,
  onCacheChanged,
  setStatus
}) {
  function getStateRecord() {
    const state = getState?.();

    if (!state || typeof state !== "object") {
      throw new Error(
        "Character realtime persistence requires creator state."
      );
    }

    return state;
  }

  function stop(
    descriptor,
    { clearCache = true } = {}
  ) {
    const state = getStateRecord();

    listeners.stop(descriptor.listenerName);

    if (clearCache) {
      state[descriptor.roomKey] = null;
      state[descriptor.cacheKey] = [];
    }

    return listeners.getSnapshot();
  }

  function getRoomCollection(
    roomCode,
    collectionName
  ) {
    if (!roomCode) {
      throw new Error(
        "Open a room before loading character creator data."
      );
    }

    if (!hasFirestoreTools()) {
      throw new Error(
        "The character creator is missing its Firestore tools."
      );
    }

    return deps.collection(
      deps.db,
      "rooms",
      roomCode,
      collectionName
    );
  }

  function reportConnectionError(
    descriptor,
    error,
    phase
  ) {
    const permissionDenied =
      error?.code === "permission-denied";
    const label = descriptor.label;

    if (
      descriptor.optional &&
      permissionDenied
    ) {
      console.warn(
        `Optional room ${label} ${phase} unavailable due to permissions. Default character creator templates still work.`,
        error
      );
      return;
    }

    if (descriptor.optional) {
      console.warn(
        `Optional room ${label} ${phase} failed. Default character creator templates still work.`,
        error
      );
      setStatus?.(
        `Could not load optional room ${label}; using defaults.`
      );
      return;
    }

    console.error(
      `Could not load character creator ${label}:`,
      error
    );
    setStatus?.(`Could not load ${label}.`);
  }

  function connect(descriptor) {
    const state = getStateRecord();
    const roomCode = getRoomCode();

    if (!roomCode || !hasFirestoreTools()) {
      stop(descriptor);
      return false;
    }

    if (
      state[descriptor.roomKey] === roomCode &&
      listeners.has(
        descriptor.listenerName,
        roomCode
      )
    ) {
      return true;
    }

    stop(descriptor);
    state[descriptor.roomKey] = roomCode;

    try {
      listeners.connect(
        descriptor.listenerName,
        roomCode,
        ({ isCurrent }) => {
          return deps.onSnapshot(
            getRoomCollection(
              roomCode,
              descriptor.collectionName
            ),
            (snapshot) => {
              if (
                !isCurrent() ||
                state[descriptor.roomKey] !==
                  roomCode
              ) {
                return;
              }

              state[descriptor.cacheKey] =
                readRealtimeSnapshotRecords(
                  snapshot
                ).map(
                  descriptor.normalizeRecord
                );

              onCacheChanged?.(
                descriptor.cacheKey
              );
            },
            (error) => {
              if (!isCurrent()) {
                return;
              }

              stop(descriptor);
              reportConnectionError(
                descriptor,
                error,
                "listener"
              );
              onCacheChanged?.(
                descriptor.cacheKey
              );
            }
          );
        }
      );

      return true;
    } catch (error) {
      reportConnectionError(
        descriptor,
        error,
        "connection"
      );
      stop(descriptor);
      return false;
    }
  }

  function getRequiredListenerIds(
    viewMode,
    currentStepId
  ) {
    if (viewMode === "library") {
      return new Set(["characters"]);
    }

    if (viewMode !== "builder") {
      return new Set();
    }

    const listenerByStep = {
      class: "classes",
      species: "species",
      background: "backgrounds"
    };
    const listenerId =
      listenerByStep[currentStepId];

    return new Set(
      listenerId ? [listenerId] : []
    );
  }

  function sync(
    descriptors,
    { viewMode, currentStepId }
  ) {
    const required = getRequiredListenerIds(
      viewMode,
      currentStepId
    );

    descriptors.forEach((descriptor) => {
      if (required.has(descriptor.id)) {
        connect(descriptor);
      } else {
        stop(descriptor, {
          clearCache: false
        });
      }
    });

    return listeners.getSnapshot();
  }

  function cleanup(descriptors) {
    descriptors.forEach((descriptor) => {
      stop(descriptor);
    });

    return listeners.getSnapshot();
  }

  return Object.freeze({
    connect,
    stop,
    sync,
    cleanup,
    getSnapshot: listeners.getSnapshot
  });
}
