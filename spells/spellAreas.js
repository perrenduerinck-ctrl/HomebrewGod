import {getSpellBehaviorSpec} from './spellBehaviorPresets.js';
export function getSpellAreaProfile(value={}) {return value.areaBehavior || getSpellBehaviorSpec({id:value.spellId||value.id}).params?.area || null;}

export function captureSpellArea(geometry, metrics) {
  if (!geometry || !metrics || !['sphere', 'cylinder'].includes(geometry.shape)) return null;
  const { width, height } = metrics;
  if (!(width > 0 && height > 0 && geometry.sizePixels > 0)) return null;
  const area = {
    x: geometry.anchor.x / width * 100, y: geometry.anchor.y / height * 100,
    radiusX: geometry.sizePixels / width * 100, radiusY: geometry.sizePixels / height * 100,
    halfTokenX: metrics.tokenPixels / width * 50, halfTokenY: metrics.tokenPixels / height * 50,
    verticalBounds: geometry.verticalBounds || null
  };
  return isValidSpellArea(area) ? area : null;
}

export function isValidSpellArea(area) {
  return Boolean(area && ['x','y','radiusX','radiusY','halfTokenX','halfTokenY'].every(k=>Number.isFinite(area[k]))
    && area.x>=0 && area.x<=100 && area.y>=0 && area.y<=100
    && area.radiusX>0 && area.radiusY>0 && area.halfTokenX>=0 && area.halfTokenY>=0
    && (!area.verticalBounds || Number.isFinite(area.verticalBounds.minFeet)&&Number.isFinite(area.verticalBounds.maxFeet)&&area.verticalBounds.minFeet<=area.verticalBounds.maxFeet));
}

export function tokenInsideSpellArea(zone, token) {
  const area = zone.area;
  if (!isValidSpellArea(area) || token.visibility === 'dm' || String(token.sceneId || '') !== zone.sceneId || String(token.floorId || '') !== zone.floorId) return false;
  if (![token.x, token.y].every(v => v !== null && v !== '' && Number.isFinite(Number(v)))) return false;
  const elevation = Number(token.elevation || 0);
  if (area.verticalBounds && (elevation < area.verticalBounds.minFeet || elevation > area.verticalBounds.maxFeet)) return false;
  const multiplier = { tiny: .5, small: 1, medium: 1, large: 2, huge: 3, gargantuan: 4 }[String(token.sizeCategory || token.creatureSize || 'medium').toLowerCase()] || 1;
  const dx = Math.max(0, Math.abs(Number(token.x) - area.x) - area.halfTokenX * multiplier) / area.radiusX;
  const dy = Math.max(0, Math.abs(Number(token.y) - area.y) - area.halfTokenY * multiplier) / area.radiusY;
  return dx * dx + dy * dy <= 1 + 1e-6;
}

export function spellAreaActive(zone, state, context) {
  return Boolean(zone?.status === 'active' && getSpellAreaProfile(zone)
    && isValidSpellArea(zone.area) && state.concentration?.spellId === zone.spellId
    && state.concentration?.startedAtMillis === zone.concentrationStartedAtMillis
    && Number(context.worldTime || 0) < zone.expiresAtWorldTime
    && (!context.initiative?.combatActive || !zone.expiresAtTurnCounter || context.initiative.turnCounter < zone.expiresAtTurnCounter));
}

export function spellAreaTrigger(zone, phase) {
  const profile = getSpellAreaProfile(zone);
  if (!profile?.triggers?.[phase]) return null;
  const trigger=profile.triggers?.[phase];if(!trigger)return null;
  const dice=trigger.baseDice+Math.max(0,(Number(zone.slotLevel)||trigger.baseLevel||0)-(trigger.baseLevel||0))*(trigger.dicePerSlot||0);
  return {formula:dice+'d'+trigger.die,damageType:trigger.damageType,
    save:trigger.saveAbility?{ability:trigger.saveAbility,dc:zone.saveDc,success:trigger.saveSuccess||'none'}:null};
}

export function spellAreaEventKey(zone, token, phase, turnCounter) {
  // Moonbeam's entry and start triggers share a per-turn receipt, including aliases.
  const actor = token.linkedCharacterId ? 'c-' + token.linkedCharacterId : (token.linkedMonsterId || token.linkedMonster?.id) ? 'm-' + (token.linkedMonsterId || token.linkedMonster.id) : token.id;
  return [zone.combatEpoch||0, turnCounter, getSpellAreaProfile(zone)?.receiptGroup === 'turn' ? 'turn' : phase, actor].join(':');
}
