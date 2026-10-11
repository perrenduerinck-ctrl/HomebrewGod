function cleanId(value) {
  return String(value || "").trim();
}

function normalizeRevision(value) {
  return Math.max(
    0,
    Math.floor(Number(value) || 0)
  );
}

export function planCharacterWrite({
  currentCharacterId,
  saveAsNew = false,
  loadedRevision = 0
} = {}) {
  const currentId = cleanId(currentCharacterId);
  const createsDocument =
    saveAsNew === true || !currentId;

  return Object.freeze({
    createsDocument,
    savedId: createsDocument
      ? null
      : currentId,
    expectedRevision: createsDocument
      ? 0
      : normalizeRevision(loadedRevision),
    writeRevision: createsDocument
      ? 1
      : normalizeRevision(loadedRevision)
  });
}
