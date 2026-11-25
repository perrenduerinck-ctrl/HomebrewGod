import { ADDITIONAL_SPELL_DETAILS } from '../data/additionalSpellDetails.js';
export const ADDITIONAL_SPELL_PROFILES = Object.freeze(ADDITIONAL_SPELL_DETAILS.map(spell => ({
  spellId: spell.id, label: spell.name,
  family: spell.areaOfEffect ? (spell.range.startsWith('Self') ? 'aura' : 'burst') : spell.range === 'Touch' ? 'touch' : 'target-impact',
  targetEffect: 'profile-glyph', palette: spell.school === 'necromancy' ? 'necrotic' : spell.school === 'conjuration' ? 'nature' : 'arcane',
  impactDuration: 1100, aftermathDuration: 500, scale: .8,
  specialOptions: {particles: 3, scaleWithLevel: false},
  ...(spell.range.startsWith('Self') ? {preview:{mode:'self',label:'Self'}} : spell.range === 'Touch' ? {preview:{mode:'target',rangeFeet:5,label:'Touch'}} : {})
})));
