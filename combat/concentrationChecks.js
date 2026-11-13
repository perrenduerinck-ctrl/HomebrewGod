// One saving throw per damage source; keep the legacy single-check field as
// the queue head so existing sheets and controls continue to work.
export function readConcentrationChecks(state = {}) {
  if (!state.concentration) return [];
  const values = Array.isArray(state.pendingConcentrationChecks) ? state.pendingConcentrationChecks
    : state.pendingConcentrationCheck ? [state.pendingConcentrationCheck] : [];
  return values.filter((entry) => Number.isFinite(Number(entry?.dc)) && Number(entry.dc) > 0)
    .map((entry) => ({ ...entry, dc: Math.max(10, Math.floor(Number(entry.dc))), damage: Math.max(0, Number(entry.damage) || 0) }));
}
export function synchronizeConcentrationChecks(state) {
  state.pendingConcentrationChecks = readConcentrationChecks(state);
  state.pendingConcentrationCheck = state.pendingConcentrationChecks[0] || null;
}
export function enqueueConcentrationCheck(state, check) {
  state.pendingConcentrationChecks = [...readConcentrationChecks(state), check];
  state.pendingConcentrationCheck = state.pendingConcentrationChecks[0];
}
export function clearConcentrationChecks(state) {
  state.pendingConcentrationChecks = [];
  state.pendingConcentrationCheck = null;
}
export function resolveConcentrationCheck(state, succeeded) {
  const pending = readConcentrationChecks(state);
  if (!succeeded) { state.concentration = null; clearConcentrationChecks(state); return; }
  state.pendingConcentrationChecks = pending.slice(1);
  state.pendingConcentrationCheck = state.pendingConcentrationChecks[0] || null;
}

export function interruptElapsedCasting(state = {}) {
  if (!state || typeof state !== "object") return;
  const attempt = state.longCasting;
  if (attempt?.mode !== "elapsed" || !["casting", "ready"].includes(attempt.status)) return;
  state.longCasting = { ...attempt, status: "interrupted", interruptionReason: "Another spell interrupted timed casting." };
  if (state.concentration?.spellId === "casting:" + attempt.id) {
    state.concentration = null;
    clearConcentrationChecks(state);
  }
}
