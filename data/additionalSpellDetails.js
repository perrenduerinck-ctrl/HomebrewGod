// Homebrew God selections: explicit per-spell mechanics over the existing class rules.
// Descriptions below are original summaries. SRD 5.2.1 adaptations are attributed
// in docs/rules/SRD-5.2.1-ATTRIBUTION.txt. Referenced summon stat blocks remain separate.
const slots = (base, dice, faces, increment = 1) => Object.fromEntries(Array.from({length:10-base}, (_,i)=>[base+i, (dice+i*increment)+'d'+faces]));
const damage = (type, atSlotLevel, label = '') => ({damageType:type, atSlotLevel, ...(label ? {label} : {})});
const spell = (id, name, level, school, classes, fields) => Object.freeze({
  id, name, level, school, classes, castingTime:'1 action', range:'Self',
  componentLetters:['V','S'], duration:'Instantaneous', concentration:false, ritual:false,
  source:'Homebrew God spell selections', sourceType:'custom', mechanicsEdition:'2014',
  mechanicsReason:'Retains the legacy spell\'s tactical options.', ...fields
});
const aura = {range:'Self (30-foot radius)', areaOfEffect:{type:'sphere',size:30}, duration:'Concentration, up to 10 minutes', concentration:true, componentLetters:['V']};
const summon = {school:'conjuration',castingTime:'1 action',range:'90 feet',targetType:'point',placementOnly:true,componentLetters:['V','S','M'],duration:'Concentration, up to 1 hour',concentration:true,
  higherLevel:'The spirit uses the chosen slot level for its published stat block. Its attacks per action equal half that level, rounded down.',
  resolutionNotes:'Place one spirit in an unoccupied space. It acts immediately after its caster, obeys verbal commands without an action, and Dodges when not commanded. It disappears at 0 HP or when concentration ends. Use the spell\'s matching spirit stat block; it is not a generic elemental, aberration, or golem monster.'};
export const ADDITIONAL_SPELL_DETAILS = Object.freeze([
 spell('ray-of-sickness','Ray of Sickness',1,'necromancy',['sorcerer','wizard'],{
  range:'60 feet',attackType:'ranged',damage:damage('poison',slots(1,2,8)),mechanicsEdition:'2024',mechanicsReason:'A successful hit poisons directly instead of requiring a second roll.',
  description:'Make a ranged spell attack against a creature. A hit deals 2d8 poison damage and poisons it until the end of your next turn. Poison immunity still applies.',higherLevel:'Add 1d8 damage for every slot level above 1.',
  resolutionNotes:'Poison is applied after a confirmed hit; there is no additional Constitution save.',conditions:[{id:'poisoned',when:'hit',duration:'until-end-source-turn'}]
 }),
 spell('searing-smite','Searing Smite',1,'evocation',['paladin'],{
  castingTime:'1 bonus action',componentLetters:['V'],duration:'1 minute',mechanicsEdition:'2024',mechanicsReason:'Cast after a hit; it does not reserve concentration or waste a spell on a miss.',
  castingTrigger:'immediately after you hit a target with a melee weapon or an unarmed strike',followupSaveAbility:'con',followupSaveTiming:'after start-turn fire damage',damage:damage('fire',slots(1,1,6)),
  description:'After an eligible hit, add 1d6 fire damage to that hit. At the start of each of the victim\'s turns it takes the fire damage again, then makes a Constitution save. A successful save ends the burning; a failure leaves it burning.',
  higherLevel:'Both the initial and recurring damage gain 1d6 per slot level above 1.',resolutionNotes:'The victim is the creature just hit, not the caster. Recurring damage is resolved at the start of its turn, before its save.'
 }),
 spell('elemental-weapon','Elemental Weapon',3,'transmutation',['artificer','paladin'],{
  range:'Touch',duration:'Concentration, up to 1 hour',concentration:true,
  description:'Touch a nonmagical weapon and choose acid, cold, fire, lightning, or thunder. It becomes magical, adds +1 to attack rolls, and deals an extra 1d4 of the chosen type on a hit.',
  higherLevel:'Slots 5–6 give +2 to attack rolls and 2d4 extra damage. Slots 7–9 give +3 and 3d4.',resolutionNotes:'Select the weapon\'s bearer on the map and identify the nonmagical weapon. The extra damage belongs to later weapon hits, not to casting this spell.',
  damage:damage('chosen element',{3:'1d4',5:'2d4',7:'3d4'},'On weapon hit')
 }),
 spell('grasping-vine','Grasping Vine',4,'conjuration',['druid','ranger'],{
  castingTime:'1 bonus action',range:'30 feet',targetType:'point',placementOnly:true,duration:'Concentration, up to 1 minute',concentration:true,saveAbility:'dex',saveSuccess:'none',
  description:'Place a vine in an unoccupied space you can see within 30 feet. Command it to pull one creature you can see within 30 feet of the vine. A failed Dexterity save pulls that creature up to 20 feet toward the vine. You can repeat the pull with a bonus action on later turns.',
  resolutionNotes:'This selection uses the legacy pulling utility. The vine does not deal damage or automatically grapple its victim.'
 }),
 spell('aura-of-purity','Aura of Purity',4,'abjuration',['paladin'],{...aura,
  description:'Nonhostile creatures in your 30-foot aura, including you, cannot contract disease, resist poison damage, and have advantage on saves against being blinded, charmed, deafened, frightened, paralyzed, poisoned, or stunned.',
  resolutionNotes:'Benefits apply while a creature is inside the moving aura. This does not automatically remove a condition already present.'
 }),
 spell('destructive-wave','Destructive Wave',5,'evocation',['paladin'],{
  range:'Self (30-foot radius)',componentLetters:['V'],areaOfEffect:{type:'sphere',size:30},saveAbility:'con',saveSuccess:'half',
  damage:[damage('thunder',{5:'5d6'}),damage('radiant or necrotic',{5:'5d6'},'Choose one type')],
  description:'Choose creatures within 30 feet of you and choose radiant or necrotic for the secondary damage. Each chosen creature makes a Constitution save. Failure deals 5d6 thunder plus 5d6 of the chosen type and knocks it prone. Success deals half of both damage components without knocking it prone.',
  resolutionNotes:'Choose which creatures are affected; allies and the caster are not automatically hit. Roll both damage components.',conditions:[{id:'prone',when:'failed-save',duration:'until-removed'}]
 }),
 spell('aura-of-vitality','Aura of Vitality',3,'evocation',['cleric','druid','paladin'],{...aura,duration:'Concentration, up to 1 minute',
  description:'Maintain a moving healing aura with a 30-foot radius. While it lasts, use a bonus action to restore 2d6 HP to one creature in the aura, including yourself.',
  mechanicsReason:'Keeps the legacy bonus-action healing so the caster chooses who needs help.',resolutionNotes:'Casting creates the aura. Each healing pulse uses a bonus action; it does not heal every creature immediately or spend another spell slot.',healingBySlotLevel:{3:'2d6'},healingTiming:'bonus action while the aura lasts'
 }),
 spell('aura-of-life','Aura of Life',4,'abjuration',['cleric','paladin'],{...aura,mechanicsEdition:'2024',mechanicsReason:'Protects allies and helps a fallen ally rejoin the fight.',
  description:'You radiate a moving 30-foot aura. You and allies in it resist necrotic damage and cannot have their maximum HP reduced. A living ally that starts its turn in the aura at 0 HP regains 1 HP.',
  resolutionNotes:'The 1 HP benefit triggers at the start of a qualifying ally\'s turn, not on every movement into the aura.'
 }),
 spell('circle-of-power','Circle of Power',5,'abjuration',['paladin'],{...aura,
  description:'You and friendly creatures within 30 feet have advantage on saves against spells and other magical effects. When such an effect normally deals half damage on a successful save, a protected creature instead takes no damage if its save succeeds.',
  resolutionNotes:'This protects against magical effects, not every saving throw or ordinary weapon damage. A failed save does not gain the successful-save benefit.'
 }),
 spell('crusaders-mantle',"Crusader\'s Mantle",3,'evocation',['paladin'],{...aura,duration:'Concentration, up to 1 minute',
  description:'Nonhostile creatures within 30 feet of you, including you, deal an extra 1d4 radiant damage when they hit with a weapon attack.',damage:damage('radiant',{3:'1d4'},'On weapon hit'),
  resolutionNotes:'Track the moving aura. Damage is added to eligible weapon hits while the attacker is in it; the cast itself deals no damage.'
 }),
 spell('ensnaring-strike','Ensnaring Strike',1,'conjuration',['ranger'],{
  castingTime:'1 bonus action',componentLetters:['V'],duration:'Concentration, up to 1 minute',concentration:true,mechanicsEdition:'2024',mechanicsReason:'Choose to ensnare after an actual weapon hit.',castingTrigger:'immediately after you hit a creature with a weapon',saveAbility:'str',saveSuccess:'none',
  damage:damage('piercing',slots(1,1,6),'Start of restrained target turn'),
  description:'After your weapon hits a creature, it makes a Strength save; Large or larger targets have advantage. On failure, magical vines restrain it. While restrained, it takes 1d6 piercing damage at the start of each turn. On a successful initial save the spell ends.',
  higherLevel:'The recurring damage gains 1d6 for every slot level above 1.',resolutionNotes:'The victim or a creature within reach can use an action for a Strength (Athletics) check against your spell save DC, ending the vines on success.',conditions:[{id:'restrained',when:'failed-save',duration:'concentration'}]
 }),
 spell('armor-of-agathys','Armor of Agathys',1,'abjuration',['warlock'],{
  componentLetters:['V','S','M'],materialText:'a cup of water',duration:'1 hour',
  damage:damage('cold',Object.fromEntries(Array.from({length:9},(_,i)=>[i+1,(i+1)*5])),'Retaliation while this spell grants temporary HP'),
  description:'Gain 5 temporary HP. While any temporary HP granted by this casting remain, a creature that hits you with a melee attack takes 5 cold damage. The spell ends when that specific temporary-HP pool is exhausted.',
  higherLevel:'Both the temporary HP and retaliatory cold damage increase by 5 for each slot level above 1.',resolutionNotes:'Temporary HP do not stack. Damage is retaliatory after a melee hit, not a ranged hit or damage from casting. Replacing this temporary-HP pool ends its retaliation.',temporaryHpBySlotLevel:Object.fromEntries(Array.from({length:9},(_,i)=>[i+1,(i+1)*5]))
 }),
 spell('compelled-duel','Compelled Duel',1,'enchantment',['paladin'],{
  castingTime:'1 bonus action',range:'30 feet',componentLetters:['V'],duration:'Concentration, up to 1 minute',concentration:true,saveAbility:'wis',saveSuccess:'none',
  description:'One creature you can see makes a Wisdom save. On failure it has disadvantage on attacks against creatures other than you. It must pass a Wisdom save to willingly move more than 30 feet from you during its turn.',
  resolutionNotes:'The effect ends if you attack another creature, target another creature with a harmful spell, an ally harms the target, or you finish your turn more than 30 feet from it. It does not force an attack or remove the target\'s choices.'
 }),
 spell('crown-of-madness','Crown of Madness',2,'enchantment',['bard','sorcerer','warlock','wizard'],{
  range:'120 feet',duration:'Concentration, up to 1 minute',concentration:true,saveAbility:'wis',saveSuccess:'none',
  description:'A humanoid you can see makes a Wisdom save. On failure it is charmed. Before moving on its turn, it must use its action to make a melee attack against a creature other than itself that you choose within its reach. If no chosen creature is within reach, it acts normally.',
  resolutionNotes:'Use your action on subsequent turns to maintain control or the spell ends. The target repeats its Wisdom save at the end of each of its turns, ending the spell on success.',conditions:[{id:'charmed',when:'failed-save',duration:'concentration'}]
 }),
 spell('phantasmal-force','Phantasmal Force',2,'illusion',['bard','sorcerer','wizard'],{
  range:'60 feet',componentLetters:['V','S','M'],materialText:'a bit of fleece',duration:'Concentration, up to 1 minute',concentration:true,saveAbility:'int',saveSuccess:'none',mechanicsEdition:'2024',mechanicsReason:'A convincing dangerous illusion can deal meaningful damage.',
  damage:damage('psychic',{2:'2d8'},'On your turn near a dangerous phantasm'),
  description:'A creature you can see makes an Intelligence save. On failure, you create an illusion no larger than a 10-foot cube that only it perceives, including sensations and sound. It rationalizes contradictory events. A dangerous phantasm can deal 2d8 psychic damage on each of your turns if the target is in its area or within 5 feet.',
  resolutionNotes:'The target can use a Study action for an Intelligence (Investigation) check against your spell save DC. Success reveals the illusion and ends the spell. The illusion is not a real object or an automatic damage zone for other creatures.'
 }),
 spell('summon-elemental','Summon Elemental',4,'conjuration',['druid','ranger','wizard'],{...summon,
  materialText:'air, a pebble, ash, and water inside a gold-inlaid vial worth at least 400 gp',materialCostGp:400,
  description:'Summon one elemental spirit in a visible unoccupied space within 90 feet. Choose air, earth, fire, or water and use that form of the Elemental Spirit stat block. The Fathomless patron\'s expanded spell permits the water form.',summonForms:['air','earth','fire','water']
 }),
 spell('dissonant-whispers','Dissonant Whispers',1,'enchantment',['bard'],{
  range:'60 feet',componentLetters:['V'],saveAbility:'wis',saveSuccess:'half',damage:damage('psychic',slots(1,3,6)),mechanicsEdition:'2024',mechanicsReason:'Keeps the forced reaction movement and tactical opportunities.',
  description:'A creature you can see makes a Wisdom save against a melody in its mind. Failure deals 3d6 psychic damage and forces it to use an available reaction to move as far away from you as possible by the safest route. Success deals half damage without movement.',higherLevel:'Add 1d6 damage per slot level above 1.',resolutionNotes:'No available reaction means no forced movement; the damage still applies. Movement follows a safe route rather than teleporting the target.'
 }),
 spell('wrathful-smite','Wrathful Smite',1,'evocation',['paladin'],{
  castingTime:'1 bonus action',componentLetters:['V'],duration:'Concentration, up to 1 minute',concentration:true,saveAbility:'wis',saveSuccess:'none',damage:damage('psychic',{1:'1d6'},'Next melee weapon hit'),
  description:'Your next melee weapon hit during the spell adds 1d6 psychic damage. That target makes a Wisdom save; failure frightens it of you until the spell ends.',resolutionNotes:'After the initial save, the target can use an action to make a Wisdom ability check against your spell save DC to end the fear. That escape roll is a check, not another saving throw. The spell adds damage to one hit only.',conditions:[{id:'frightened',when:'failed-save',duration:'concentration'}]
 }),
 spell('staggering-smite','Staggering Smite',4,'evocation',['paladin'],{
  castingTime:'1 bonus action',componentLetters:['V'],duration:'Concentration, up to 1 minute',concentration:true,saveAbility:'wis',saveSuccess:'none',damage:damage('psychic',{4:'4d6'},'Next melee weapon hit'),
  description:'Your next melee weapon hit during the spell adds 4d6 psychic damage. The victim makes a Wisdom save. On failure it has disadvantage on attack rolls and ability checks and cannot take reactions until the end of its next turn.',resolutionNotes:'The extra damage is added once after a hit. The Wisdom save governs the debuff, not the added damage.'
 }),
 spell('banishing-smite','Banishing Smite',5,'abjuration',['paladin'],{
  castingTime:'1 bonus action',componentLetters:['V'],duration:'Concentration, up to 1 minute',concentration:true,damage:damage('force',{5:'5d10'},'Next weapon hit'),
  description:'Your next weapon hit during the spell adds 5d10 force damage. If that damage leaves the victim at 50 HP or fewer, banish it. A creature native to another plane returns to its home plane; a local creature is incapacitated in a harmless demiplane until the spell ends.',resolutionNotes:'Check HP after resolving the triggering hit. A local creature returns to its original or nearest unoccupied space when the effect ends. There is no additional saving throw.'
 }),
 spell('feign-death','Feign Death',3,'necromancy',['bard','cleric','druid','wizard'],{
  range:'Touch',componentLetters:['V','S','M'],materialText:'a pinch of graveyard dirt',duration:'1 hour',ritual:true,
  description:'Touch a willing creature to make it appear dead. For one hour it is blinded, incapacitated, and has speed 0, while resisting all damage except psychic. Effects that determine whether it is dead perceive it as dead. Disease and poison symptoms are suspended, not cured.',resolutionNotes:'You can touch the target and use an action to end the effect early. This is a willing-target ritual, not an offensive incapacitation spell.'
 }),
 spell('dragons-breath',"Dragon\'s Breath",2,'transmutation',['sorcerer','wizard'],{
  castingTime:'1 bonus action',range:'Touch',componentLetters:['V','S','M'],materialText:'a hot pepper',duration:'Concentration, up to 1 minute',concentration:true,mechanicsEdition:'2024',mechanicsReason:'An ally gains a repeatable breath weapon and chooses its element.',
  followupSaveAbility:'dex',followupSaveTiming:'when the recipient uses the breath action',damage:damage('chosen element',slots(2,3,6),'Later breath action'),
  description:'Touch a willing creature and choose acid, cold, fire, lightning, or poison. While the spell lasts, that creature can use its action to breathe a 15-foot cone. Each creature in the cone makes a Dexterity save, taking 3d6 of the chosen type on failure or half on success.',higherLevel:'Each breath gains 1d6 damage per slot level above 2.',resolutionNotes:'Casting targets the willing recipient and does not breathe the cone yet. Use the caster\'s spell save DC when the recipient uses the breath action.'
 }),
 spell('elemental-bane','Elemental Bane',4,'transmutation',['artificer','druid','warlock','wizard'],{
  range:'90 feet',duration:'Concentration, up to 1 minute',concentration:true,saveAbility:'con',saveSuccess:'none',damage:damage('chosen element',{4:'2d6'},'First matching damage each turn'),
  description:'Choose a creature you can see and acid, cold, fire, lightning, or thunder. It makes a Constitution save. On failure it loses resistance to that damage type, and the first time each turn it takes that type of damage it takes an extra 2d6 of the same type.',higherLevel:'Target one additional creature per slot level above 4; chosen targets must be within 30 feet of each other.',resolutionNotes:'The bonus triggers once per turn, not once per attack or once per round. Immunity is not removed. There is no immediate damage merely for casting.'
 }),
 spell('summon-draconic-spirit','Summon Draconic Spirit',5,'conjuration',['druid','sorcerer','wizard'],{...summon,range:'60 feet',materialText:'an object engraved with a dragon image worth at least 500 gp',materialCostGp:500,mechanicsEdition:'2024',mechanicsReason:'Uses the streamlined Summon Dragon spirit while retaining the legacy name and class access.',
  description:'Summon one allied dragon spirit in a visible unoccupied space within 60 feet. Use the 2024 Draconic Spirit stat block: AC 14 plus slot level, HP 50 plus 10 per slot above 5, walk 30 feet, fly 60 feet, and swim 30 feet. Choose acid, cold, fire, lightning, or poison for its breath and your shared resistance.',
  resolutionNotes:'It acts after you, makes a number of Rend attacks equal to half the slot level rounded down, and uses its 30-foot-cone breath. Rend uses your spell attack modifier and deals 1d6 + 4 + slot level piercing. Breath uses your spell save DC for 2d6 chosen damage, half on a successful Dexterity save. It resists all five elemental types and is immune to charmed, frightened, and poisoned.',summonForms:['acid','cold','fire','lightning','poison']
 }),
 spell('arms-of-hadar','Arms of Hadar',1,'conjuration',['warlock'],{
  excludeCaster:true,range:'Self (10-foot radius)',componentLetters:['V','S'],areaOfEffect:{type:'sphere',size:10},saveAbility:'str',saveSuccess:'half',damage:damage('necrotic',slots(1,2,6)),
  description:'Creatures within 10 feet of you make a Strength save against grasping dark tendrils. Failure deals 2d6 necrotic damage and prevents reactions until the creature\'s next turn. Success deals half damage without blocking reactions.',higherLevel:'Add 1d6 damage per slot level above 1.',resolutionNotes:'Exclude the caster, but include other creatures in the area unless another feature permits excluding them.'
 }),
 spell('hunger-of-hadar','Hunger of Hadar',3,'conjuration',['warlock'],{
  followupSaveAbility:'dex',followupSaveTiming:'ending a turn in the sphere, for acid damage only',range:'150 feet',componentLetters:['V','S','M'],materialText:'a pickled octopus tentacle',areaOfEffect:{type:'sphere',size:20},duration:'Concentration, up to 1 minute',concentration:true,
  damage:[damage('cold',{3:'2d6'},'Start of turn in the area'),damage('acid',{3:'2d6'},'End of turn after failed Dexterity save')],
  description:'Create a 20-foot-radius sphere of supernatural darkness and difficult terrain. Creatures fully inside are blinded; ordinary and magical light cannot illuminate the area. Starting a turn inside deals 2d6 cold damage. Ending a turn inside requires a Dexterity save or deals 2d6 acid damage.',resolutionNotes:'These are two different turn triggers. Neither component is immediate cast damage; the cold component has no save, and the end-turn save applies only to acid.'
 }),
 spell('summon-aberration','Summon Aberration',4,'conjuration',['warlock','wizard'],{...summon,
  materialText:'a pickled tentacle and eyeball in a platinum-inlaid vial worth at least 400 gp',materialCostGp:400,
  description:'Summon one allied aberrant spirit in a visible unoccupied space within 90 feet. Choose beholderkin, slaad, or star spawn and use the corresponding Aberrant Spirit stat block. Beholderkin emphasize flight and ranged attacks, slaadi regeneration and melee, and star spawn psychic presence.',summonForms:['beholderkin','slaad','star-spawn']
 }),
 spell('summon-construct','Summon Construct',4,'conjuration',['artificer','wizard'],{...summon,
  materialText:'an ornate lockbox worth at least 400 gp',materialCostGp:400,
  description:'Summon one allied construct spirit in a visible unoccupied space within 90 feet. Choose clay, metal, or stone and use the corresponding Construct Spirit stat block. The forms offer berserk retaliation, a heated body, or a slowing presence.',summonForms:['clay','metal','stone']
 })
]);
export const ADDITIONAL_SPELL_COUNT = ADDITIONAL_SPELL_DETAILS.length;
