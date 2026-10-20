const text = (value) => String(value ?? "").trim();

const CONFIG = Object.freeze({
  character: Object.freeze({
    label: "character",
    id(token) {
      return text(token?.linkedCharacterId || token?.sheetId);
    },
    missing: "The linked character no longer exists or is not available to this account."
  }),
  monster: Object.freeze({
    label: "monster",
    id(token) {
      return text(token?.linkedMonsterId || token?.linkedMonster?.id);
    },
    missing: "The linked monster no longer exists."
  })
});

function getConfig(kind) {
  const config = CONFIG[text(kind).toLowerCase()];
  if (!config) throw new Error("Choose a supported linked record type.");
  return config;
}

export function getLinkedTokenRecordId(token, kind) {
  const config = getConfig(kind);
  const id = config.id(token);
  if (!id) throw new Error(`This token is not linked to a ${config.label}.`);
  return id;
}

export function requireLinkedTokenRecord(record, { kind, id } = {}) {
  const config = getConfig(kind);
  if (!record) throw new Error(config.missing);
  const expectedId = text(id);
  const recordId = text(record.id || record.firestoreDocumentId || expectedId);
  if (!expectedId || recordId !== expectedId) {
    throw new Error(`The linked ${config.label} record did not match the selected token.`);
  }
  return {
    ...record,
    id: expectedId,
    firestoreDocumentId: expectedId
  };
}
