// Opt-in Animation ID assignments wrap the existing spell presentation boundary.
// Unassigned, missing and failed custom assets fall back to the legacy sequence.
export function createAnimationSpellAdapter({ legacy, player, library, bindings, onStateChange = () => {} }) {
  const active = new Map(); let nextId = 0, destroyed = false;
  const emit = () => { try { onStateChange(active.size); } catch { /* presentation observer */ } };
  function cancel(record) {
    record.controller.abort(); record.result?.cancel?.(); record.fallback?.cancel?.();
    active.delete(record.id); emit();
  }
  function play(event = {}, options = {}) {
    if (destroyed) return { ok: false, skipped: true, reason: "sequence-system-destroyed" };
    // Preserve the casting-sequence contract: Off is an intentional successful skip.
    if (player.getMode() === "off") return { ok: true, skipped: true, reason: "effects-off" };
    const reference = event.animationId ? { animationId: event.animationId } :
      event.animations ? { animations: event.animations } : bindings.getAssignment(`spell:${event.spellId}`);
    if (!reference || options.sequenceId) return legacy.play(event, options);
    const ids = reference.animationId ? [reference.animationId] :
      ["cast", "travel", "impact", "sustain", "end"].map(stage => reference.animations?.[stage]).filter(Boolean);
    if (!ids.length || ids.some(id => !library.getAnimation(id))) return legacy.play(event, options);
    // Bounded presentation-only playback even when a user assigns a looping aura.
    const point = event.targetPoint || event.casterPoint || { x: 0, y: 0 };
    const record = { id: `animation-cast-${++nextId}`, event, controller: new AbortController() };
    while (active.size >= 16) cancel(active.values().next().value);
    active.set(record.id, record); emit();
    const ready = player.playSequence(ids.map(animationId => ({ animationId, duration: 5000 })), {
      x: point.x, y: point.y, elevation: event.targetElevation || 0, signal: record.controller.signal
    }).then(result => {
      if (!active.has(record.id)) { result.cancel?.(); return result; }
      record.result = result;
      if (!result.ok) {
        active.delete(record.id); emit();
        if (!["cancelled", "destroyed", "effects-off"].includes(result.reason)) {
          record.fallback = legacy.play(event, options);
          return record.fallback;
        }
      } else result.finished.finally(() => { active.delete(record.id); emit(); });
      return result;
    });
    return { ok: true, id: record.id, ready, cancel: () => cancel(record), animationId: reference.animationId || null };
  }
  return Object.freeze({ ...legacy, play,
    cancel(id, reason) { const record = active.get(id); if (record) { cancel(record); return true; } return legacy.cancel?.(id, reason) || false; },
    clear(reason) { [...active.values()].forEach(cancel); legacy.clear(reason); },
    clearPreviews() { [...active.values()].filter(r => r.event.preview).forEach(cancel); legacy.clearPreviews(); },
    getState() { const old = legacy.getState(); return { ...old, activeCount: old.activeCount + active.size,
      sequences: [...old.sequences, ...[...active.values()].map(r => ({ id: r.id, definitionId: "animation-id", phase: "animation" }))] }; },
    destroy() { if (destroyed) return; destroyed = true; [...active.values()].forEach(cancel); legacy.destroy(); }
  });
}
