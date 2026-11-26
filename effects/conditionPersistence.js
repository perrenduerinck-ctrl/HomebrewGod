import { applyGameplayAction } from "../characterSheet/gameplayState.js";
import { applyMonsterConcentrationEvent } from "../combat/monsterSpellcasting.js";
import { getSpellcasterBlockReason } from "../spells/spellCastingRules.js";

// Prepare every read before the caller writes the effect and companion records.
export async function prepareConditionMutation(transaction, { db, doc, roomCode, userUid, record, tokenCollection = "tokens", remove = false, serverTimestamp }) {
  if (record.type !== "condition") return { write() {} };
  const roomRef = doc(db, "rooms", roomCode);
  const tokenRef = doc(db, "rooms", roomCode, tokenCollection, record.targetTokenId);
  const [room, tokenSnapshot] = await Promise.all([transaction.get(roomRef), transaction.get(tokenRef)]);
  if (!room.exists() || room.data().dmUid !== userUid) throw new Error("Only the current room DM can change conditions.");
  if (!tokenSnapshot.exists() && !remove) throw new Error("The effect target moved or no longer exists. Select it again.");
  const spell = record.spell || record.timing?.spell;
  const token = tokenSnapshot.exists() ? tokenSnapshot.data() : {};
  const effectConditions = { ...(token.effectConditions || {}) };
  if (remove) delete effectConditions[record.id];
  else effectConditions[record.id] = record.definitionId;
  const ending = !remove && Boolean(getSpellcasterBlockReason({ conditions: [record.definitionId] }));
  const storedKey = remove ? spell?.targetActorKey || (record.targetCharacterId ? 'characters:'+record.targetCharacterId : '') : '';
  const key = storedKey || (token.linkedCharacterId ? 'characters:'+token.linkedCharacterId : token.linkedMonsterId || token.linkedMonster?.id ? 'monsters:'+(token.linkedMonsterId || token.linkedMonster.id) : '');
  const split = key.indexOf(':'), kind = split >= 0 ? key.slice(0,split) : '', id = split >= 0 ? key.slice(split+1) : '';
  const actorRef = ['characters','monsters'].includes(kind) && id ? doc(db,'rooms',roomCode,kind,id) : null;
  const actorSnapshot = actorRef ? await transaction.get(actorRef) : null;
  let actor = null;
  if (actorSnapshot?.exists()) {
    const remote = actorSnapshot.data(); actor = structuredClone(remote);
    const state = kind === 'characters' ? (actor.combat ||= {}) : (actor.spellcasting ||= {});
    state.effectConditions = { ...(state.effectConditions || {}) };
    if (remove) delete state.effectConditions[record.id];
    else state.effectConditions[record.id] = record.definitionId;
    if (ending) {
      if (kind === 'characters') applyGameplayAction(actor, {type:'end-concentration'});
      else actor = applyMonsterConcentrationEvent(actor, {type:'condition',condition:record.definitionId});
    }
    actor.revision = Math.max(0, Number(remote.revision) || 0) + 1;
  }
  return {
    character: kind === 'characters' ? actor : null, characterId: kind === 'characters' ? id : '',
    monster: kind === 'monsters' ? actor : null, monsterId: kind === 'monsters' ? id : '',
    write() {
      if (tokenSnapshot.exists()) transaction.update(tokenRef, { effectConditions, updatedAtMillis: Date.now(), updatedAt: serverTimestamp() });
      if (actor) transaction.update(actorRef, { [kind === 'characters' ? 'combat' : 'spellcasting']: actor[kind === 'characters' ? 'combat' : 'spellcasting'], revision: actor.revision, updatedAtMillis: Date.now(), updatedAt: serverTimestamp() });
    }
  };
}
