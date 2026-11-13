import { applyGameplayAction } from "../characterSheet/gameplayState.js";
import { applyMonsterConcentrationEvent } from "../combat/monsterSpellcasting.js";
import { getSpellcasterBlockReason } from "../spells/spellCastingRules.js";

// Prepare every read before the caller writes the effect and these companion records.
export async function prepareConditionMutation(transaction, { db, doc, roomCode, userUid, record, tokenCollection = "tokens", remove = false, serverTimestamp }) {
  if (record.type !== "condition") return { write() {} };
  const roomRef = doc(db, "rooms", roomCode);
  const tokenRef = doc(db, "rooms", roomCode, tokenCollection, record.targetTokenId);
  const [room, tokenSnapshot] = await Promise.all([transaction.get(roomRef), transaction.get(tokenRef)]);
  if (!room.exists() || room.data().dmUid !== userUid) throw new Error("Only the current room DM can change conditions.");
  if (!tokenSnapshot.exists()) {
    if (remove) return { write() {} };
    throw new Error("The effect target moved or no longer exists. Select it again.");
  }
  const token = tokenSnapshot.data();
  const effectConditions = { ...(token.effectConditions || {}) };
  if (remove) delete effectConditions[record.id];
  else effectConditions[record.id] = record.definitionId;
  const ending = !remove && Boolean(getSpellcasterBlockReason({ conditions: [record.definitionId] }));
  const characterId = token.linkedCharacterId;
  const monsterId = token.linkedMonsterId || token.linkedMonster?.id;
  const actorRef = ending && (characterId || monsterId) ? doc(db, "rooms", roomCode, characterId ? "characters" : "monsters", characterId || monsterId) : null;
  const actorSnapshot = actorRef ? await transaction.get(actorRef) : null;
  let actor = null;
  if (actorSnapshot?.exists()) {
    const remote = actorSnapshot.data();
    if (characterId && remote.combat?.concentration) {
      actor = structuredClone(remote); applyGameplayAction(actor, { type: "end-concentration" });
    } else if (monsterId && remote.spellcasting?.concentration) actor = applyMonsterConcentrationEvent(remote, { type: "condition", condition: record.definitionId });
    if (actor) actor.revision = Math.max(0, Number(remote.revision) || 0) + 1;
  }
  return {
    character: characterId ? actor : null, characterId,
    monster: monsterId ? actor : null, monsterId,
    write() {
      transaction.update(tokenRef, { effectConditions, updatedAtMillis: Date.now(), updatedAt: serverTimestamp() });
      if (actor) transaction.update(actorRef, { [characterId ? "combat" : "spellcasting"]: actor[characterId ? "combat" : "spellcasting"], revision: actor.revision, updatedAtMillis: Date.now(), updatedAt: serverTimestamp() });
    }
  };
}
