export function retainAcknowledgedCreatorRecord(records, saved) {
  const current = Array.isArray(records) ? records : [];
  const id = String(saved?.id || "").trim();
  if (!id) return [...current];
  return [saved, ...current.filter((record) => String(record?.id || "") !== id)];
}

export function creatorSaveRefreshMessage(name, error) {
  const label = String(name || "Creation").trim() || "Creation";
  const detail = String(error?.message || error || "unknown refresh error").trim();
  return `${label} was saved, but the library list could not refresh: ${detail}. Use Refresh to retry.`;
}
