export const SIDEBAR_SECTIONS = Object.freeze([
  {
    id: "play",
    label: "Play",
    items: [
      { id: "play-battle", icon: "◆", label: "Battle Map", action: "screen", target: "battle", room: true },
      { id: "play-characters", icon: "♙", label: "Characters", action: "screen", target: "characterCreator", room: true }
    ]
  },
  {
    id: "tools",
    label: "Tools",
    items: [
      { id: "tool-combat", icon: "☷", label: "Combat Tracker", action: "tool", target: "combatTracker", room: true },
      { id: "tool-time", icon: "◷", label: "Calendar / Time", action: "tool", target: "campaignTime", room: true },
      { id: "tool-effects", icon: "✦", label: "Effects", action: "tool", target: "effects", room: true },
      { id: "tool-token", icon: "⬡", label: "Token Builder", action: "tool", target: "tokenBuilder", room: true, roles: ["dm"] },
      { id: "tool-map", icon: "▦", label: "Map Builder", action: "tool", target: "mapBuilder", room: true, roles: ["dm"] },
      { id: "tool-options", icon: "⚙", label: "Display / Audio", action: "tool", target: "displayOptions", room: true }
    ]
  },
  {
    id: "create",
    label: "Create",
    items: [
      { id: "create-character", icon: "+", label: "Character", action: "screen", target: "characterCreator", room: true },
      { id: "create-monster", icon: "+", label: "Monster", action: "screen", target: "monsterCreator", room: true, roles: ["dm"] },
      { id: "create-magic-item", icon: "+", label: "Magic Item", action: "screen", target: "magicItemCreator", room: true },
      { id: "create-spell", icon: "+", label: "Spell", action: "screen", target: "spellCreator", room: true },
      { id: "create-npc", icon: "+", label: "NPC", action: "screen", target: "npcCreator", room: true },
      { id: "create-encounter", icon: "+", label: "Encounter", action: "screen", target: "encounterCreator", room: true, roles: ["dm"] },
      { id: "create-summon", icon: "+", label: "Summon Preset", action: "screen", target: "summonCreator", room: true },
      { id: "create-animation", icon: "+", label: "Animation", action: "tool", target: "animationCreator", room: true }
    ]
  },
  {
    id: "campaign",
    label: "Campaign",
    roles: ["dm"],
    items: [
      { id: "campaign-room", icon: "⌂", label: "Room Dashboard", action: "screen", target: "room", room: true },
      { id: "campaign-maps", icon: "▧", label: "Maps / Images", action: "screen", target: "room", room: true }
    ]
  },
  {
    id: "library",
    label: "Library",
    items: [
      { id: "library-workshop", icon: "▤", label: "My Library", action: "workshop", target: "library", room: true },
      { id: "library-characters", icon: "♙", label: "Characters", action: "screen", target: "characterCreator", room: true },
      { id: "library-monsters", icon: "♞", label: "Monsters", action: "screen", target: "monsterCreator", room: true, roles: ["dm"] },
      { id: "library-items", icon: "◇", label: "Magic Items", action: "screen", target: "magicItemCreator", room: true },
      { id: "library-spells", icon: "✧", label: "Spells", action: "screen", target: "spellCreator", room: true },
      { id: "library-npcs", icon: "♟", label: "NPCs", action: "screen", target: "npcCreator", room: true },
      { id: "library-encounters", icon: "⚔", label: "Encounters", action: "screen", target: "encounterCreator", room: true, roles: ["dm"] },
      { id: "library-summons", icon: "◎", label: "Summons", action: "screen", target: "summonCreator", room: true },
      { id: "library-animations", icon: "◈", label: "Animations", action: "tool", target: "animationLibrary", room: true },
      { id: "library-community", icon: "♢", label: "Community", action: "workshop", target: "browse", room: true },
      { id: "library-collections", icon: "▥", label: "Collections", action: "workshop", target: "collections", room: true }
    ]
  },
  {
    id: "world",
    label: "World",
    roles: ["dm"],
    items: [
      { id: "world-time", icon: "◷", label: "Calendar / Time", action: "tool", target: "campaignTime", room: true }
    ]
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      { id: "settings-room", icon: "⌂", label: "Room Settings", action: "screen", target: "room", room: true, roles: ["dm"] },
      { id: "settings-display", icon: "⚙", label: "Display / Controls / Audio", action: "tool", target: "displayOptions", room: true }
    ]
  }
]);

export function visibleSidebarSections({ role = "player", roomOpen = false } = {}) {
  const visible = (entry) => (!entry.roles || entry.roles.includes(role)) && (!entry.room || roomOpen);
  return SIDEBAR_SECTIONS
    .filter(visible)
    .map((section) => ({ ...section, items: section.items.filter(visible) }))
    .filter((section) => section.items.length);
}
