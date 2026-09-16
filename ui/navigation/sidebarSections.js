export const SIDEBAR_SECTIONS = Object.freeze([
  {
    id: "quick",
    label: "Quick",
    items: [
      { id: "quick-battle", label: "Battle Map", action: "screen", target: "battle", room: true },
      { id: "quick-combat", label: "Combat Tracker", action: "tool", target: "combatTracker", room: true },
      { id: "quick-characters", label: "Characters", action: "screen", target: "characterCreator", room: true },
      { id: "quick-animations", label: "Animations", action: "tool", target: "animationLibrary", room: true }
    ]
  },
  {
    id: "play",
    label: "Play",
    items: [
      { id: "play-battle", label: "Battle Map", action: "screen", target: "battle", room: true },
      { id: "play-combat", label: "Combat Tracker", action: "tool", target: "combatTracker", room: true },
      { id: "play-characters", label: "Characters", action: "screen", target: "characterCreator", room: true }
    ]
  },
  {
    id: "tools",
    label: "Tools",
    items: [
      { id: "tool-combat", label: "Combat Tracker", action: "tool", target: "combatTracker", room: true },
      { id: "tool-time", label: "Calendar / Time", action: "tool", target: "campaignTime", room: true },
      { id: "tool-effects", label: "Effects", action: "tool", target: "effects", room: true },
      { id: "tool-token", label: "Token Builder", action: "tool", target: "tokenBuilder", room: true, roles: ["dm"] },
      { id: "tool-map", label: "Map Builder", action: "tool", target: "mapBuilder", room: true, roles: ["dm"] },
      { id: "tool-options", label: "Display / Audio", action: "tool", target: "displayOptions", room: true }
    ]
  },
  {
    id: "create",
    label: "Create",
    items: [
      { id: "create-character", label: "Character Creator", action: "screen", target: "characterCreator", room: true },
      { id: "create-monster", label: "Monster Creator", action: "screen", target: "monsterCreator", room: true, roles: ["dm"] },
      { id: "create-animation", label: "Animation Creator", action: "tool", target: "animationCreator", room: true }
    ]
  },
  {
    id: "campaign",
    label: "Campaign",
    roles: ["dm"],
    items: [
      { id: "campaign-room", label: "Room Dashboard", action: "screen", target: "room", room: true },
      { id: "campaign-maps", label: "Maps / Images", action: "screen", target: "room", room: true }
    ]
  },
  {
    id: "library",
    label: "Library",
    items: [
      { id: "library-characters", label: "Characters", action: "screen", target: "characterCreator", room: true },
      { id: "library-monsters", label: "Monsters", action: "screen", target: "monsterCreator", room: true, roles: ["dm"] },
      { id: "library-animations", label: "Animations", action: "tool", target: "animationLibrary", room: true }
    ]
  },
  {
    id: "world",
    label: "World",
    roles: ["dm"],
    items: [
      { id: "world-time", label: "Calendar / Time", action: "tool", target: "campaignTime", room: true }
    ]
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      { id: "settings-room", label: "Room Settings", action: "screen", target: "room", room: true, roles: ["dm"] },
      { id: "settings-display", label: "Display / Controls / Audio", action: "tool", target: "displayOptions", room: true }
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
