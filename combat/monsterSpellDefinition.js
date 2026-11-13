function requireDefinition(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Missing spell definition");
  return value;
}

export async function resolveMonsterSpellDefinition(reference = {}, presentation = {}, { loadSpell, getCatalogSpell } = {}) {
  const sourceId = String(reference.sourceId || reference.spellId || presentation.id || "").trim();
  if (!sourceId) throw new Error("This monster spell is missing its stable spell reference.");

  if (reference.source === "custom") {
    try {
      const definition = requireDefinition(await loadSpell(sourceId));
      if (!definition) throw new Error("Missing spell definition");
      return definition;
    } catch {
      throw new Error(`${reference.name || "This custom monster spell"} is missing or inaccessible. Restore the saved spell or repair its reference in Monster Creator.`);
    }
  }

  if (reference.source === "library") {
    try {
      return requireDefinition(await loadSpell(sourceId));
    } catch {
      // Older monster records also used "library" for built-in catalog IDs.
    }
  }

  const catalogSpell = getCatalogSpell(sourceId);
  if (catalogSpell) return catalogSpell;

  try {
    return requireDefinition(await loadSpell(sourceId));
  } catch {
    throw new Error(
      `${reference.name || "This monster spell"} no longer resolves to a catalog or personal Library spell. Repair its reference in Monster Creator.`
    );
  }
}


export function assertSpellDefinitionRevision(expected, latest) {
  if (!expected) return;
  if (!latest || Number(latest.revision || 0) !== Number(expected.revision || 0)) {
    throw new Error("The saved spell definition changed or was deleted. Select the spell again.");
  }
}
