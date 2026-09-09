import { createCombatEffectSystem, getCombatActorPoint } from "./combatEffects.js";

export function createCombatSpriteTestControls({ container, surface, engine,
  location = globalThis.location } = {}) {
  const player = createCombatEffectSystem({ engine });
  const enabled = ["localhost", "127.0.0.1", "::1"].includes(location?.hostname) ||
    /(?:^|[?&])(?:vfxTest|smokeTest)=1(?:&|$)/.test(location?.search || "");
  if (!container || !enabled) return player;
  container.hidden = false;
  const field = name => container.querySelector(`[data-combat-${name}]`);
  const attackerSelect = field("attacker"), targetSelect = field("target");
  let clickedTokenId = "", revision = 0;
  const tokens = () => [...surface.querySelectorAll(".hg-token[data-token-id]")]
    .filter(token => token.getBoundingClientRect().width > 0);
  function refreshChoices() {
    const list = tokens();
    for (const [select, defaults] of [[attackerSelect, [["", "Last clicked / first token"]]],
      [targetSelect, [["", "Nearest other token"], ["none", "No target (attack right)"]]]]) {
      const selected = select.value;
      select.replaceChildren(...[...defaults, ...list.map(t => [t.dataset.tokenId, t.dataset.tokenName || "Token"])]
        .map(([value, text]) => new Option(text, value)));
      if ([...select.options].some(option => option.value === selected)) select.value = selected;
    }
  }
  function rememberToken(event) {
    const token = event.target.closest?.(".hg-token[data-token-id]");
    if (!token || event.button !== 0) return;
    clickedTokenId = token.dataset.tokenId;
    // Observe only: do not prevent selection, dragging, menus or spell targeting.
    field("status").textContent = `Attacker: ${token.dataset.tokenName || "Token"}`;
  }
  function open() {
    const expanded = field("fields").hidden;
    field("fields").hidden = !expanded;
    field("toggle").setAttribute("aria-expanded", String(expanded));
    if (expanded) { refreshChoices(); void player.preload(); }
  }
  async function play() {
    const currentRevision = revision;
    refreshChoices();
    const list = tokens();
    const selected = list.find(t => t.matches('[aria-selected="true"], .is-selected'));
    const attacker = list.find(t => t.dataset.tokenId === attackerSelect.value) || selected ||
      list.find(t => t.dataset.tokenId === clickedTokenId) || list[0];
    const overlay = engine.getOverlayElement();
    const rect = overlay.getBoundingClientRect();
    const start = attacker || { x: rect.width / 2, y: rect.height / 2, width: 64 };
    const point = getCombatActorPoint(start, rect);
    const others = list.filter(t => t !== attacker);
    const target = targetSelect.value === "none" ? null :
      others.find(t => t.dataset.tokenId === targetSelect.value) ||
      others.sort((a, b) => {
        const pa = getCombatActorPoint(a, rect), pb = getCombatActorPoint(b, rect);
        return Math.hypot(pa.x - point.x, pa.y - point.y) - Math.hypot(pb.x - point.x, pb.y - point.y);
      })[0];
    field("status").textContent = "Loading sword slash…";
    const fps = Number(field("fps").value);
    const result = await player.playCombatEffect("melee.swordSlash", start, target, {
      fps, scale: Number(field("scale").value), debug: field("debug").checked
    });
    // Reveal the battle map instead of leaving the animation behind the tools.
    const menu = container.closest("#battleToolsMenu");
    if (result.ok && menu) menu.open = false;
    if (revision === currentRevision) field("status").textContent = result.ok
      ? `36 frames · ${fps} FPS · ${(36 / fps).toFixed(2)} seconds`
      : result.reason === "effects-off" ? "Effects are off. Choose Full or Reduced to test."
      : `Sword slash unavailable (${result.reason || "effect limit"}).`;
  }
  function clear() { revision++; player.clear(); field("status").textContent = "Combat effects cleared."; }
  surface.addEventListener("pointerdown", rememberToken, { capture: true, passive: true });
  field("toggle").addEventListener("click", open);
  field("play").addEventListener("click", play);
  field("clear").addEventListener("click", clear);
  return Object.freeze({ ...player, clear, destroy() {
    clear(); player.destroy();
    surface.removeEventListener("pointerdown", rememberToken, true);
    field("toggle").removeEventListener("click", open);
    field("play").removeEventListener("click", play);
    field("clear").removeEventListener("click", clear);
  } });
}
