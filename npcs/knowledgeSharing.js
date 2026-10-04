import { normalizeNpc } from "./npcModel.js";

export function applyNpcKnowledgeShare(sourceRaw, targetRaw, knowledgeId, worldTime = 0) {
  const sourceNpc = normalizeNpc(sourceRaw);
  const targetNpc = normalizeNpc(targetRaw);
  const entryIndex = sourceNpc.knowledge.findIndex((entry) => entry.id === String(knowledgeId || ""));
  if (entryIndex < 0) throw new Error("Choose knowledge owned by the source NPC.");
  if (sourceNpc.id === targetNpc.id) throw new Error("Choose a different target NPC.");
  const timestamp = Number(worldTime);
  const knowledge = sourceNpc.knowledge.map((entry, index) => index === entryIndex ? {
    ...entry,
    tags: [...entry.tags],
    sourceNpcId: entry.sourceNpcId || sourceNpc.id,
    knownByNpcIds: [...new Set([sourceNpc.id, ...entry.knownByNpcIds, targetNpc.id])],
    sharedAtWorldTime: Number.isFinite(timestamp) ? timestamp : null
  } : { ...entry, tags: [...entry.tags], knownByNpcIds: [...entry.knownByNpcIds] });
  return normalizeNpc({ ...sourceNpc, knowledge, updatedAtMillis: Date.now() });
}

export function knowledgeKnownByNpc(npcs = [], npcId = "") {
  const wantedId = String(npcId || "");
  return npcs.flatMap((npcRaw) => {
    const npc = normalizeNpc(npcRaw);
    return npc.knowledge
      .filter((entry) => entry.knownByNpcIds.includes(wantedId) || (npc.id === wantedId && !entry.knownByNpcIds.length))
      .map((entry) => ({ ...entry, ownerNpcId: npc.id, ownerNpcName: npc.name }));
  });
}
