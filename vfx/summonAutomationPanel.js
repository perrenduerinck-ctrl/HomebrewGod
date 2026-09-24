import { normalizeSummonAutomation } from "./summonAutomation.js";

function normalizeCatalog(value = {}) {
  return {
    tokens: (Array.isArray(value.tokens) ? value.tokens : [])
      .filter((entry) => entry?.id && ["monster", "character"].includes(entry.type))
      .map((entry) => ({ ...entry, id: String(entry.id), name: String(entry.name || "Unnamed") })),
    players: (Array.isArray(value.players) ? value.players : [])
      .filter((entry) => entry?.uid)
      .map((entry) => ({ uid: String(entry.uid), name: String(entry.name || entry.displayName || "Player") }))
  };
}

export function createSummonAutomationPanel({
  document = globalThis.document,
  library = null,
  catalog = {}
} = {}) {
  const options = normalizeCatalog(catalog);
  const root = document.createElement("fieldset");
  root.className = "hg-summon-automation-settings";
  root.dataset.combatSummonSettings = "true";
  root.innerHTML = `<legend>Summoned Token</legend>
    <div class="hg-spell-animation-overrides">
      <label>Token source<select data-summon-source-type><option value="monster">Choose Monster</option><option value="character">Choose Character</option><option value="custom">Custom Token</option></select></label>
      <label data-summon-source-record>Saved source<select data-summon-source-id></select></label>
      <label data-summon-custom>Name<input data-summon-name maxlength="120" placeholder="Summon"></label>
      <label data-summon-custom>Image URL<input data-summon-image type="url" maxlength="2048" placeholder="https://..."></label>
      <label data-summon-custom>Size<select data-summon-size><option value="tiny">Tiny</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="huge">Huge</option><option value="gargantuan">Gargantuan</option></select></label>
      <label data-summon-custom>Token type<select data-summon-token-type><option value="npc">NPC</option><option value="enemy">Enemy</option><option value="player">Player</option><option value="object">Object</option></select></label>
      <label>Spawn location<select data-summon-location><option value="target">Target Point</option><option value="caster">Caster</option><option value="around-caster">Around Caster</option><option value="around-target">Around Target</option><option value="manual">User Places Tokens</option></select></label>
      <label>Count<input data-summon-count type="number" min="1" max="20" step="1" value="1"></label>
      <label>Spawn timing<select data-summon-timing><option value="start">Animation Start</option><option value="event">Animation Event</option><option value="end">Animation End</option></select></label>
      <label data-summon-event-row>Animation event<input data-summon-event maxlength="80" value="impact" placeholder="impact"></label>
      <label>Ownership<select data-summon-ownership><option value="dm">DM Controlled</option><option value="caster">Caster Controlled</option><option value="player">Specific Player</option></select></label>
      <label data-summon-player-row>Specific player<select data-summon-player></select></label>
      <label>Initiative<select data-summon-initiative><option value="after-caster">Immediately after caster</option><option value="roll">Roll initiative</option><option value="shared">Shared initiative</option><option value="none">Do not add automatically</option></select></label>
      <label>Duration<select data-summon-duration><option value="permanent">Permanent</option><option value="dismissed">Until dismissed</option><option value="rounds">X rounds</option><option value="minutes">X minutes</option><option value="concentration">Concentration linked</option></select></label>
      <label data-summon-duration-row>Duration amount<input data-summon-duration-value type="number" min="1" max="1000000" step="1" value="1"></label>
      <label>On end<select data-summon-on-end><option value="remove">Remove token</option><option value="dismiss">Play dismiss animation</option><option value="leave">Leave token</option></select></label>
      <label data-summon-dismiss-row>Dismiss animation<select data-summon-dismiss-animation></select></label>
      <label class="hg-animation-toggle"><input data-summon-prevent-overlap type="checkbox" checked>Prevent overlap</label>
      <label class="hg-animation-toggle"><input data-summon-nearest-free type="checkbox" checked>Find nearest free squares</label>
      <label class="hg-animation-toggle"><input data-summon-dm-override type="checkbox" checked>Allow DM override</label>
    </div>`;

  const field = (name) => root.querySelector(`[data-summon-${name}]`);
  for (const animation of library?.list?.() || []) {
    field("dismiss-animation").append(new Option(animation.name, animation.id));
  }
  field("dismiss-animation").prepend(new Option("Use configured End animation", ""));

  for (const player of options.players) {
    field("player").append(new Option(player.name, player.uid));
  }
  if (!options.players.length) field("player").append(new Option("No active players", ""));

  function populateSources(selected = "") {
    const type = field("source-type").value;
    const select = field("source-id");
    const matching = options.tokens.filter((entry) => entry.type === type);
    select.replaceChildren(...matching.map((entry) => new Option(entry.name, entry.id)));
    if (selected && !matching.some((entry) => entry.id === selected)) {
      select.append(new Option(`Saved source: ${selected}`, selected));
    }
    if (!select.options.length) select.append(new Option(`No saved ${type}s`, ""));
    select.value = selected || select.options[0]?.value || "";
  }

  function sync() {
    const custom = field("source-type").value === "custom";
    root.querySelector("[data-summon-source-record]").hidden = custom;
    root.querySelectorAll("[data-summon-custom]").forEach((row) => { row.hidden = !custom; });
    root.querySelector("[data-summon-event-row]").hidden = field("timing").value !== "event";
    root.querySelector("[data-summon-player-row]").hidden = field("ownership").value !== "player";
    root.querySelector("[data-summon-duration-row]").hidden = !["rounds", "minutes"].includes(field("duration").value);
    root.querySelector("[data-summon-dismiss-row]").hidden = field("on-end").value !== "dismiss";
  }

  field("source-type").addEventListener("change", () => { populateSources(); sync(); });
  for (const name of ["timing", "ownership", "duration", "on-end"]) {
    field(name).addEventListener("change", sync);
  }

  function write(value = {}) {
    const summon = normalizeSummonAutomation(value);
    field("source-type").value = summon.sourceType;
    populateSources(summon.sourceId);
    field("name").value = summon.name;
    field("image").value = summon.imageUrl;
    field("size").value = summon.sizeCategory;
    field("token-type").value = summon.tokenType;
    field("location").value = summon.spawnLocation;
    field("count").value = summon.count;
    field("timing").value = summon.spawnTiming;
    field("event").value = summon.eventName;
    field("ownership").value = summon.ownership.mode;
    if (summon.ownership.playerUid && ![...field("player").options].some((option) => option.value === summon.ownership.playerUid)) {
      field("player").append(new Option(`Saved player: ${summon.ownership.playerUid}`, summon.ownership.playerUid));
    }
    field("player").value = summon.ownership.playerUid;
    field("initiative").value = summon.initiative;
    field("duration").value = summon.duration.mode;
    field("duration-value").value = summon.duration.value;
    field("on-end").value = summon.onEnd.mode;
    const dismissId = summon.onEnd.dismissAnimationId;
    if (dismissId && ![...field("dismiss-animation").options].some((option) => option.value === dismissId)) {
      field("dismiss-animation").append(new Option(`Missing animation: ${dismissId}`, dismissId));
    }
    field("dismiss-animation").value = dismissId;
    field("prevent-overlap").checked = summon.placement.preventOverlap;
    field("nearest-free").checked = summon.placement.nearestFree;
    field("dm-override").checked = summon.placement.allowDmOverride;
    sync();
  }

  function read() {
    if (field("source-type").value !== "custom" && !field("source-id").value) {
      throw new Error("Choose a saved monster or character for the summoned token.");
    }
    if (field("ownership").value === "player" && !field("player").value) {
      throw new Error("Choose the player who will control the summoned token.");
    }
    const selected = options.tokens.find((entry) => (
      entry.type === field("source-type").value && entry.id === field("source-id").value
    ));
    return normalizeSummonAutomation({
      sourceType: field("source-type").value,
      sourceId: field("source-id").value,
      name: field("source-type").value === "custom" ? field("name").value : selected?.name,
      imageUrl: field("source-type").value === "custom" ? field("image").value : selected?.imageUrl,
      sizeCategory: field("source-type").value === "custom" ? field("size").value : selected?.sizeCategory,
      tokenType: field("source-type").value === "custom" ? field("token-type").value : selected?.tokenType,
      spawnLocation: field("location").value,
      count: field("count").value,
      spawnTiming: field("timing").value,
      eventName: field("event").value,
      ownership: { mode: field("ownership").value, playerUid: field("player").value },
      initiative: field("initiative").value,
      duration: { mode: field("duration").value, value: field("duration-value").value },
      onEnd: { mode: field("on-end").value, dismissAnimationId: field("dismiss-animation").value },
      placement: {
        preventOverlap: field("prevent-overlap").checked,
        nearestFree: field("nearest-free").checked,
        allowDmOverride: field("dm-override").checked
      }
    });
  }

  populateSources();
  write({});
  return Object.freeze({ root, read, write, sync, field });
}
