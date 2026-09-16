function text(value) {
  return String(value ?? "").trim();
}

function legacyActionKey(name) {
  return `actions:${text(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

export function selectCombatTargets(targetMode, source, selected = []) {
  const targets = (Array.isArray(selected) ? selected : []).filter(Boolean);
  if (targetMode === "self") return source ? [source] : [];
  if (targetMode === "single") return [targets[0] || source].filter(Boolean);
  return targets.length ? targets : [source].filter(Boolean);
}

export function buildCombatPresentationSteps(content, sequence = []) {
  const children = (Array.isArray(sequence) ? sequence : []).filter(Boolean).slice(0, 16);
  if (!children.length) return [{ content, presentationOnly: false }].filter((entry) => entry.content);
  return [
    { content, presentationOnly: true },
    ...children.map((entry) => ({ content: entry, presentationOnly: false }))
  ].filter((entry) => entry.content);
}

export function resolveMonsterMultiattackSequence(action = {}, monster = {}) {
  const entries = Object.values(monster || {})
    .flatMap((value) => Array.isArray(value) ? value : [])
    .filter((entry) => entry && typeof entry === "object" && entry.name);
  const animations = monster.actionAnimations || {};
  return (Array.isArray(action.sequence) ? action.sequence : [])
    .flatMap((step) => {
      const actionId = text(typeof step === "string" ? step : step?.actionId);
      const count = typeof step === "string"
        ? 1
        : Math.max(1, Math.min(8, Math.round(Number(step?.count) || 1)));
      const named = entries.find((entry) => text(entry.id) === actionId) ||
        entries.find((entry) => actionId.endsWith(
          text(entry.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
        ));
      const raw = animations[actionId] || animations[legacyActionKey(named?.name)];
      if (!raw || !actionId) return [];
      const child = {
        ...(named || {}),
        id: named?.id || actionId,
        key: named?.id || actionId,
        name: named?.name || actionId,
        animation: raw.animation || raw
      };
      return Array.from({ length: count }, () => ({ ...child }));
    })
    .slice(0, 16);
}
