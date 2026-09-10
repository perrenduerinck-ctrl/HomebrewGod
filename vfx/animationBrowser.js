import { ANIMATION_TYPES } from "./animationLibrary.js";
import { createVfxAssetCache } from "./vfxAssetManifest.js";
import { getSpriteFrameStyle } from "./spriteAnimator.js";
import { resolveVfxAlphaSource } from "./alphaAssets.js";

// Reusable browser plus a compact selector. All text from user definitions is
// assigned with textContent/Option, never interpolated into HTML.
export function createAnimationSelector({ container, library, onSelect = () => {} }) {
  container.innerHTML = `<label>Search animations<input data-animation-search type="search" placeholder="Name, type or tag"></label>
    <div class="hg-animation-filter-row"><label>Type<select data-animation-type><option value="">All types</option></select></label>
    <label>Sort<select data-animation-sort><option value="name">Name</option><option value="newest">Newest</option><option value="used">Most used</option></select></label></div>
    <details class="hg-animation-filters"><summary>More filters</summary><label>Tags<input data-animation-filter-tags placeholder="fire, sword…"></label>
    <label>Collection<select data-animation-origin><option value="">Built-in + Custom</option><option value="builtin">Built-in</option><option value="user">Custom</option></select></label>
    <div class="hg-animation-buttons"><label class="hg-animation-toggle"><input type="checkbox" data-animation-favorites>Favorites</label><label class="hg-animation-toggle"><input type="checkbox" data-animation-recent>Recently used</label></div></details>
    <div data-animation-cards class="hg-animation-cards" aria-label="Animation browser"></div>
    <button type="button" data-animation-more hidden>Show more</button>
    <div class="hg-animation-compact"><label>Compact selector<select data-animation-select></select></label></div>
    <p data-animation-results class="hg-animation-hint"></p>`;
  const field = name => container.querySelector(`[data-animation-${name}]`);
  for (const type of ANIMATION_TYPES) field("type").add(new Option(type, type));
  const cache = createVfxAssetCache({ maximumEntries: 32, onError: () => {} });
  let selectedId = library.list()[0]?.id || "", limit = 24, revision = 0, destroyed = false;
  const listeners = [], on = (node, event, fn) => { node.addEventListener(event, fn); listeners.push(() => node.removeEventListener(event, fn)); };
  let observer;
  async function thumbnail(node, animation, current) {
    if (!animation || destroyed || current !== revision) return;
    if (!await cache.preload(animation.sprite) || destroyed || current !== revision || !node.isConnected) return;
    const dimensions = cache.getDimensions(animation.sprite); if (!dimensions) return;
    const w = dimensions.width / animation.grid.columns, h = dimensions.height / animation.grid.rows, factor = 66 / Math.max(w, h);
    const atlas = animation.atlas || { ...dimensions, columns: Array.from({ length: animation.grid.columns + 1 }, (_, i) => i * w), rows: Array.from({ length: animation.grid.rows + 1 }, (_, i) => i * h) };
    Object.assign(node.style, getSpriteFrameStyle({ src: animation.sprite, preserveGrid: true, columns: animation.grid.columns, rows: animation.grid.rows,
      frameCount: animation.frames.end + 1, frameWidth: w * factor, frameHeight: h * factor, atlas: { ...atlas, inset: animation.inset } }, Math.round((animation.frames.start + animation.frames.end) / 2)));
    node.style.backgroundImage = `url(${JSON.stringify(resolveVfxAlphaSource(animation.sprite))})`;
  }
  function refresh() {
    const current = ++revision; observer?.disconnect();
    const all = library.query({ search: field("search").value, type: field("type").value, tags: field("filter-tags").value,
      origin: field("origin").value, favorites: field("favorites").checked, recent: field("recent").checked, sort: field("sort").value });
    const visible = all.slice(0, limit);
    if (!all.some(a => a.id === selectedId)) selectedId = all[0]?.id || "";
    field("select").replaceChildren(...all.slice(0, 300).map(a => new Option(a.name, a.id))); field("select").value = selectedId;
    const cards = [];
    if (globalThis.IntersectionObserver) observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { observer.unobserve(entry.target); thumbnail(entry.target, library.getAnimation(entry.target.dataset.thumbnailId), current); }
    }), { root: container.closest("dialog"), rootMargin: "100px" });
    for (const a of visible) {
      const card = document.createElement("div"); card.className = "hg-animation-card"; card.dataset.selected = String(a.id === selectedId);
      const choose = document.createElement("button"); choose.type = "button"; choose.dataset.chooseAnimation = a.id; choose.setAttribute("aria-pressed", String(a.id === selectedId));
      const art = document.createElement("span"); art.className = "hg-animation-thumb";
      const sprite = document.createElement("span"); sprite.dataset.thumbnailId = a.id; art.appendChild(sprite);
      const title = document.createElement("strong"); title.textContent = a.name;
      const type = document.createElement("small"); type.textContent = `${a.type} · ${a.ownership.kind === "user" ? "Custom" : "Built-in"}`;
      const tags = document.createElement("span"); tags.className = "hg-animation-card-tags"; tags.textContent = a.tags.slice(0, 3).join(" · ");
      choose.append(art, title, type, tags);
      const favorite = document.createElement("button"); favorite.type = "button"; favorite.className = "hg-animation-favorite"; favorite.dataset.favoriteAnimation = a.id;
      favorite.textContent = library.getUsage(a.id).favorite ? "★" : "☆"; favorite.setAttribute("aria-label", `Favorite ${a.name}`); favorite.setAttribute("aria-pressed", String(library.getUsage(a.id).favorite));
      card.append(choose, favorite); cards.push(card);
    }
    field("cards").replaceChildren(...cards);
    for (const node of field("cards").querySelectorAll("[data-thumbnail-id]")) {
      if (observer) observer.observe(node); else thumbnail(node, library.getAnimation(node.dataset.thumbnailId), current);
    }
    field("more").hidden = all.length <= limit || limit >= 300;
    field("results").textContent = `${all.length} animations${all.length > limit ? ` · showing ${Math.min(all.length, limit)}` : ""}${all.length ? "" : " · Try a different filter."}`;
  }
  function select(id, reset = false) {
    selectedId = id;
    if (reset) { for (const key of ["search", "type", "filter-tags", "origin"]) field(key).value = ""; field("favorites").checked = field("recent").checked = false; }
    library.markUsed(id); refresh(); onSelect(id);
  }
  for (const key of ["search", "type", "sort", "filter-tags", "origin", "favorites", "recent"]) on(field(key), ["search", "filter-tags"].includes(key) ? "input" : "change", () => { limit = 24; refresh(); onSelect(selectedId); });
  on(field("select"), "change", () => select(field("select").value));
  on(field("cards"), "click", event => {
    const favorite = event.target.closest("[data-favorite-animation]"); if (favorite) { const previous = selectedId; library.toggleFavorite(favorite.dataset.favoriteAnimation); if (previous !== selectedId) onSelect(selectedId); return; }
    const card = event.target.closest("[data-choose-animation]"); if (card) select(card.dataset.chooseAnimation);
  });
  on(field("more"), "click", () => { limit += 24; refresh(); });
  const unsubscribe = library.subscribe(refresh); refresh();
  return { getSelectedId: () => selectedId, select: id => select(id, true), refresh,
    destroy() { destroyed = true; revision++; observer?.disconnect(); cache.clear(); unsubscribe(); listeners.forEach(remove => remove()); } };
}
