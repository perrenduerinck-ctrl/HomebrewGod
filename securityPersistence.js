export const MAX_SECURE_IMAGE_BYTES =
  8 * 1024 * 1024;

export const ALLOWED_SECURE_IMAGE_TYPES =
  Object.freeze([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif"
  ]);

const ALLOWED_IMAGE_EXTENSIONS =
  Object.freeze([
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif",
    "avif"
  ]);

function cleanText(value, fallback = "") {
  const cleaned = String(
    value == null
      ? ""
      : value
  ).trim();

  return cleaned || fallback;
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : fallback;
}

function getFileExtension(fileName) {
  const parts =
    cleanText(fileName)
      .toLowerCase()
      .split(".");

  return parts.length > 1
    ? parts.pop()
    : "";
}

export function validateSecureImageDescriptor(
  file,
  options = {}
) {
  if (!file) {
    throw new Error(
      "Choose an image file first."
    );
  }

  const maximumBytes = Math.max(
    1,
    safeNumber(
      options.maximumBytes,
      MAX_SECURE_IMAGE_BYTES
    )
  );
  const size =
    safeNumber(file.size, 0);

  if (size <= 0) {
    throw new Error(
      "The selected image file is empty or unreadable."
    );
  }

  if (size > maximumBytes) {
    throw new Error(
      "Image files must be 8 MB or smaller."
    );
  }

  const mimeType =
    cleanText(file.type)
      .toLowerCase();
  const extension =
    getFileExtension(file.name);
  const supportedMime =
    ALLOWED_SECURE_IMAGE_TYPES
      .includes(mimeType);
  const supportedFallback =
    !mimeType &&
    ALLOWED_IMAGE_EXTENSIONS
      .includes(extension);

  if (
    !supportedMime &&
    !supportedFallback
  ) {
    throw new Error(
      "Use a JPEG, PNG, WebP, GIF, or AVIF image."
    );
  }

  return {
    size,
    mimeType:
      mimeType ||
      (
        extension === "jpg"
          ? "image/jpeg"
          : "image/" + extension
      ),
    extension,
    maximumBytes
  };
}

export function getTimestampMillis(value) {
  if (
    value &&
    typeof value.toMillis === "function"
  ) {
    return safeNumber(
      value.toMillis(),
      0
    );
  }

  if (value instanceof Date) {
    return safeNumber(
      value.getTime(),
      0
    );
  }

  if (
    value &&
    typeof value === "object" &&
    Number.isFinite(Number(value.seconds))
  ) {
    return (
      Number(value.seconds) * 1000 +
      Math.floor(
        safeNumber(
          value.nanoseconds,
          0
        ) / 1000000
      )
    );
  }

  return safeNumber(value, 0);
}

export function getRecordRevisionMillis(
  record
) {
  return Math.max(
    safeNumber(
      record?.revisionMillis,
      0
    ),
    safeNumber(
      record?.updatedAtMillis,
      0
    ),
    safeNumber(
      record?.builder
        ?.lastSavedAtMillis,
      0
    ),
    getTimestampMillis(
      record?.updatedAt
    )
  );
}

export function assertNoStaleRevision({
  remoteRecord,
  expectedRevisionMillis,
  label = "record"
}) {
  const remoteRevision =
    getRecordRevisionMillis(
      remoteRecord
    );
  const expectedRevision =
    safeNumber(
      expectedRevisionMillis,
      0
    );

  if (
    remoteRevision > 0 &&
    expectedRevision <= 0
  ) {
    throw new Error(
      `Cannot change this ${label} because this tab did not load a saved revision. Reload it and try again.`
    );
  }

  if (
    remoteRevision > expectedRevision
  ) {
    throw new Error(
      `Cannot change this ${label} because another tab or client saved a newer version. Reload it before saving again.`
    );
  }

  return true;
}

export function assertCharacterMutationAccess({
  actorUid,
  roomDmUid,
  ownerUid,
  label = "character"
}) {
  const actor =
    cleanText(actorUid);
  const dm =
    cleanText(roomDmUid);
  const owner =
    cleanText(ownerUid);

  if (!actor) {
    throw new Error(
      `Sign in before changing this ${label}.`
    );
  }

  if (actor === dm) {
    return true;
  }

  if (!owner) {
    throw new Error(
      `Only the room DM can claim or change this legacy ${label} because it has no recorded owner.`
    );
  }

  if (owner !== actor) {
    throw new Error(
      `Only this ${label}'s owner or the room DM can change it.`
    );
  }

  return true;
}

export function assertMonsterMutationAccess({
  actorUid,
  roomDmUid,
  ownerUid
}) {
  const actor =
    cleanText(actorUid);
  const dm =
    cleanText(roomDmUid);
  const owner =
    cleanText(ownerUid);

  if (!actor || !dm || actor !== dm) {
    throw new Error(
      "Only the room DM can change monsters."
    );
  }

  if (owner && owner !== dm) {
    throw new Error(
      "This monster has invalid ownership metadata and must be repaired before it can be changed."
    );
  }

  return true;
}

export function classifyConnectionState({
  online = true,
  fromCache = false,
  hasPendingWrites = false,
  hasConnected = false
} = {}) {
  if (!online) {
    return {
      id: "offline",
      label:
        "Offline — changes remain local until the connection returns.",
      severity: "warning"
    };
  }

  if (
    fromCache ||
    hasPendingWrites
  ) {
    return {
      id: "reconnecting",
      label:
        "Reconnecting — waiting for Firebase to confirm saved changes.",
      severity: "warning"
    };
  }

  if (hasConnected) {
    return {
      id: "connected",
      label:
        "Connected — Firebase changes are synchronized.",
      severity: "success"
    };
  }

  return {
    id: "connecting",
    label:
      "Connecting to Firebase…",
    severity: "neutral"
  };
}

export function friendlyServiceError(
  error,
  options = {}
) {
  const service =
    cleanText(
      options.service,
      "service"
    ) || "service";
  const action =
    cleanText(
      options.action,
      "complete that action"
    ) || "complete that action";
  const code =
    cleanText(error?.code)
      .toLowerCase();
  const message =
    cleanText(error?.message)
      .toLowerCase();

  if (
    code.includes("permission-denied") ||
    message.includes("permission")
  ) {
    return (
      `The ${service} blocked this request. ` +
      "Check your room membership or ownership and try again."
    );
  }

  if (
    code.includes("unauthenticated") ||
    code.includes("auth/") ||
    message.includes("sign in")
  ) {
    return (
      `Sign in again before trying to ${action}.`
    );
  }

  if (
    code.includes("unavailable") ||
    code.includes("network") ||
    message.includes("network") ||
    message.includes("offline") ||
    message.includes("failed to fetch")
  ) {
    return (
      `The ${service} is temporarily unreachable. ` +
      "Your local work is still available; reconnect and try again."
    );
  }

  if (
    code.includes("resource-exhausted") ||
    message.includes("too large")
  ) {
    return (
      `The ${service} rejected the request because it was too large.`
    );
  }

  return (
    `Could not ${action}. ` +
    `The ${service} did not accept the request.`
  );
}

export function createPersistenceMonitor(
  options = {}
) {
  const windowObject =
    options.windowObject ||
    (
      typeof window !== "undefined"
        ? window
        : null
    );
  const navigatorObject =
    options.navigatorObject ||
    windowObject?.navigator ||
    {
      onLine: true
    };
  const onChange =
    typeof options.onChange === "function"
      ? options.onChange
      : function () {};
  let hasConnected = false;
  let metadata = {
    fromCache: false,
    hasPendingWrites: false
  };

  function readState() {
    return classifyConnectionState({
      online:
        navigatorObject.onLine !== false,
      fromCache:
        metadata.fromCache === true,
      hasPendingWrites:
        metadata.hasPendingWrites === true,
      hasConnected
    });
  }

  function emit() {
    const state = readState();
    onChange(state);
    return state;
  }

  function handleOffline() {
    emit();
  }

  function handleOnline() {
    metadata = {
      ...metadata,
      fromCache: true
    };
    emit();
  }

  if (
    windowObject &&
    typeof windowObject.addEventListener ===
      "function"
  ) {
    windowObject.addEventListener(
      "offline",
      handleOffline
    );
    windowObject.addEventListener(
      "online",
      handleOnline
    );
  }

  emit();

  return {
    noteSnapshot(nextMetadata = {}) {
      metadata = {
        fromCache:
          nextMetadata.fromCache === true,
        hasPendingWrites:
          nextMetadata.hasPendingWrites ===
          true
      };

      if (
        navigatorObject.onLine !== false &&
        !metadata.fromCache &&
        !metadata.hasPendingWrites
      ) {
        hasConnected = true;
      }

      return emit();
    },
    getState: readState,
    destroy() {
      if (
        windowObject &&
        typeof windowObject.removeEventListener ===
          "function"
      ) {
        windowObject.removeEventListener(
          "offline",
          handleOffline
        );
        windowObject.removeEventListener(
          "online",
          handleOnline
        );
      }
    }
  };
}

export function buildDeletionRecoveryState({
  roomExists,
  deletionMarkerPresent,
  cleanupCompleted
}) {
  if (!roomExists) {
    return {
      action: "finish-local-cleanup",
      recoverable: false
    };
  }

  if (
    deletionMarkerPresent &&
    !cleanupCompleted
  ) {
    return {
      action: "clear-deletion-marker",
      recoverable: true
    };
  }

  return {
    action: "resume-room",
    recoverable: true
  };
}
