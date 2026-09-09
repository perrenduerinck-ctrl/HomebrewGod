import { ANIMATION_CATEGORIES, MAX_UPLOAD_BYTES, normalizeAnimation } from "./animationLibrary.js";
import { createAnimationPlayer } from "./animationPlayer.js";
import { createBattleMapEffectEngine } from "./effectEngine.js";

// Reusable chooser for future creators. Selection is only a draft until its
// host calls onSelect/assign; searching and previewing never modify gameplay.
export function createAnimationSelector({ container, library, onSelect = () => {} }) {
  container.innerHTML = `<label>Search animations<input data-animation-search type="search" placeholder="Name or tag"></label>
    <label>Category<select data-animation-category><option value="">All categories</option></select></label>
    <label>Animation<select data-animation-select></select></label><p data-animation-results class="hg-animation-hint"></p>`;
  const field = name => container.querySelector(`[data-animation-${name}]`);
  const search = field("search"), category = field("category"), select = field("select");
  let selectedId = library.list()[0]?.id || "";
  function refresh() {
    const filter = category.value;
    category.replaceChildren(new Option("All categories", ""), ...[...new Set([...ANIMATION_CATEGORIES,
      ...library.list().map(a => a.category)])].sort().map(c => new Option(c, c)));
    category.value = filter;
    const all = library.searchAnimations(search.value).filter(a => !filter || a.category === filter);
    const visible = all.slice(0, 300);
    select.replaceChildren(...visible.map(a => new Option(`${a.name}${a.ownership.kind === "user" ? " · Custom" : ""}`, a.id)));
    if (!visible.some(a => a.id === selectedId)) selectedId = visible[0]?.id || "";
    select.value = selectedId;
    field("results").textContent = all.length > 300 ? `${all.length} matches; showing 300. Search to narrow the list.` : `${all.length} animations`;
  }
  function changed() { selectedId = select.value; onSelect(selectedId); }
  function filter() { refresh(); onSelect(selectedId); }
  search.addEventListener("input", filter); category.addEventListener("change", filter); select.addEventListener("change", changed);
  const unsubscribe = library.subscribe(refresh); refresh();
  return { getSelectedId: () => selectedId,
    select(id) { selectedId = id; search.value = ""; category.value = ""; refresh(); onSelect(selectedId); },
    destroy() { unsubscribe(); search.removeEventListener("input", filter); category.removeEventListener("change", filter); select.removeEventListener("change", changed); }
  };
}

export function createAnimationEditor({ dialog, button, library, bindings, actions = [] }) {
  if (!dialog || !button) return { stop() {}, close() {}, destroy() {} };
  dialog.innerHTML = `<div class="hg-animation-heading"><div><h2 id="animationLibraryTitle">Animations</h2>
    <p>Choose a look for an action, or create your own.</p></div><button data-animation-close type="button" aria-label="Close animations">Close</button></div>
    <p class="hg-animation-session">Custom animations and assignments last for this page session. Reloading restores the defaults.</p>
    <div class="hg-animation-columns"><section><div data-animation-chooser></div>
    <div class="hg-animation-buttons"><button data-animation-edit type="button">Edit settings</button><button data-animation-duplicate type="button">Duplicate</button>
    <button data-animation-custom type="button">Custom Animation</button></div>
    <label>Assign to<select data-animation-action></select></label>
    <p data-animation-assigned class="hg-animation-hint"></p>
    <div class="hg-animation-buttons"><button data-animation-assign type="button">Change animation</button><button data-animation-reset type="button">Use original effect</button></div>
    </section><section aria-label="Animation preview"><div data-animation-preview class="hg-animation-preview"></div>
    <div class="hg-animation-preview-options"><label>Preview FPS<input data-animation-preview-fps type="number" min="1" max="60" value="24"></label>
    <label>Preview scale<input data-animation-preview-scale type="number" min="0.1" max="8" step="0.1" value="1"></label></div>
    <div class="hg-animation-buttons"><button data-animation-play type="button">Play</button><button data-animation-stop type="button">Stop</button><button data-animation-replay type="button">Replay</button></div>
    <p data-animation-preview-info class="hg-animation-hint"></p></section></div>
    <form data-animation-form hidden><h3 data-animation-editor-title>Create animation</h3>
    <div class="hg-animation-form-grid">
    <label>Name<input data-animation-name maxlength="120" required></label>
    <label>Category<select data-animation-editor-category></select></label>
    <label>Sprite sheet<input data-animation-file type="file" accept="image/png,image/webp,image/jpeg"></label>
    <p data-animation-file-info class="hg-animation-hint">PNG, WebP or JPEG, up to 8 MB. Transparent PNG is recommended.</p>
    <label>Grid<select data-animation-grid><option value="4">4 × 4</option><option value="5">5 × 5</option><option value="6" selected>6 × 6</option><option value="7">7 × 7</option><option value="custom">Custom</option></select></label>
    <div data-animation-custom-grid hidden class="hg-animation-custom-grid"><label>Columns<input data-animation-columns type="number" min="1" max="240" value="6"></label>
    <label>Rows<input data-animation-rows type="number" min="1" max="240" value="6"></label></div>
    <label>Frames to play<input data-animation-frames type="number" min="1" max="240" value="36" required></label>
    <label>FPS<input data-animation-fps type="number" min="1" max="60" value="24" step="1" required></label>
    <label>Scale<input data-animation-scale type="number" min="0.1" max="8" step="0.1" value="1" required></label>
    <label>Playback<select data-animation-playback><option value="once">Once</option><option value="loop">Loop until stopped</option></select></label>
    </div><div class="hg-animation-buttons"><button data-animation-draft-preview type="button">Preview draft</button><button type="submit">Save Animation</button>
    <button data-animation-editor-cancel type="button">Cancel editing</button></div></form>
    <p data-animation-status role="status"></p>`;
  const field = name => dialog.querySelector(`[data-animation-${name}]`);
  const status = message => { field("status").textContent = message; };
  const previewSurface = field("preview");
  const previewEngine = createBattleMapEffectEngine({ surface: previewSurface });
  const preview = createAnimationPlayer({ engine: previewEngine, library, onError: () => {} });
  let previewRevision = 0, editRevision = 0, editId = null, draftSource = "", draftBase = null, destroyed = false;
  const listeners = [];
  const on = (element, event, fn) => { element.addEventListener(event, fn); listeners.push(() => element.removeEventListener(event, fn)); };
  const safely = fn => async event => { try { await fn(event); } catch (e) { status(e.message || "The animation could not be updated."); } };
  function stop() { previewRevision++; preview.clear(); field("preview-info").textContent = "Preview stopped."; }
  function selected() { return library.getAnimation(chooser.getSelectedId()); }
  function selectionChanged() {
    stop(); const a = selected();
    if (!a) return;
    field("preview-fps").value = a.fps; field("preview-scale").value = a.scale;
    field("preview-info").textContent = `${a.grid.columns} × ${a.grid.rows} · ${a.frameCount} frames · ${a.playback === "loop" ? "Loops until stopped" : "Plays once"}`;
    field("form").hidden = true; editRevision++;
  }
  const chooser = createAnimationSelector({ container: field("chooser"), library, onSelect: selectionChanged });
  field("action").replaceChildren(...actions.map(a => new Option(a.name, a.key)));
  function assignmentInfo() {
    const id = bindings.getAssignment(field("action").value)?.animationId;
    field("assigned").textContent = id ? `Assigned: ${library.getAnimation(id)?.name || "Unavailable animation"}` : "Assigned: original effect";
  }
  field("editor-category").replaceChildren(...ANIMATION_CATEGORIES.map(c => new Option(c, c)));
  function openEditor(a = null) {
    stop(); editRevision++; editId = a?.id || null; draftBase = a; draftSource = a?.sprite || "";
    field("form").hidden = false; field("editor-title").textContent = a ? `Edit ${a.name}` : "Create animation";
    field("name").value = a?.name || ""; field("file").value = "";
    field("editor-category").value = ANIMATION_CATEGORIES.includes(a?.category) ? a.category : "Other";
    const columns = a?.grid.columns || 6, rows = a?.grid.rows || 6;
    field("grid").value = columns === rows && [4,5,6,7].includes(columns) ? String(columns) : "custom";
    field("custom-grid").hidden = field("grid").value !== "custom";
    field("columns").value = columns; field("rows").value = rows;
    field("frames").value = a?.frameCount || columns * rows; field("fps").value = a?.fps || 24;
    field("scale").value = a?.scale || 1; field("playback").value = a?.playback || "once";
    field("file-info").textContent = a ? "Current sheet retained. Upload a file to replace it." : "PNG, WebP or JPEG, up to 8 MB. Transparent PNG is recommended.";
    field("name").focus();
  }
  function draft() {
    const columns = Number(field("columns").value), rows = Number(field("rows").value);
    const sameSheet = draftBase?.sprite === draftSource && draftBase?.grid.columns === columns && draftBase?.grid.rows === rows;
    return normalizeAnimation({ ...(draftBase || {}), id: editId || "draft_preview", name: field("name").value,
      sprite: draftSource, grid: { columns, rows }, frameCount: Number(field("frames").value),
      fps: Number(field("fps").value), scale: Number(field("scale").value), playback: field("playback").value,
      category: field("editor-category").value, atlas: sameSheet ? draftBase.atlas : null, inset: sameSheet ? draftBase.inset : 0 });
  }
  async function play(definition, fromDraft = false) {
    stop(); const current = previewRevision;
    if (!definition) throw new Error("Choose an animation first.");
    if (fromDraft) { field("preview-fps").value = definition.fps; field("preview-scale").value = definition.scale; }
    const options = { x: previewSurface.clientWidth / 2, y: previewSurface.clientHeight / 2,
      ...(fromDraft ? {} : { fps: Number(field("preview-fps").value), scale: Number(field("preview-scale").value) }) };
    const result = await preview.previewAnimation(definition, options);
    if (current !== previewRevision) { result.cancel?.(); return; }
    if (!result.ok) throw new Error(result.message || "The animation could not be played.");
    field("preview-info").textContent = `${definition.frameCount} frames · ${options.fps ?? definition.fps} FPS · ${definition.loop ? "Loops until Stop" : "Plays once"}`;
    result.finished.then(() => { if (current === previewRevision) field("preview-info").textContent += " · Finished"; });
    status(fromDraft ? "Previewing unsaved settings." : "Preview only. Assignments are unchanged.");
  }
  on(button, "click", () => { dialog.showModal(); selectionChanged(); assignmentInfo(); });
  on(field("close"), "click", () => dialog.close());
  // Handle the modal before the map-tools Escape shortcut hides its ancestor.
  on(dialog, "keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); dialog.close(); }
  });
  on(dialog, "close", () => { stop(); editRevision++; });
  on(field("action"), "change", assignmentInfo);
  on(field("assign"), "click", safely(() => {
    const id = chooser.getSelectedId();
    if (!library.getAnimation(id)) throw new Error("Choose an animation first.");
    bindings.setAnimation(field("action").value, id); assignmentInfo(); status("Animation changed for this session.");
  }));
  on(field("reset"), "click", safely(() => { bindings.setAnimation(field("action").value, null); assignmentInfo(); status("Original effect restored."); }));
  on(field("custom"), "click", () => openEditor());
  on(field("edit"), "click", safely(() => { if (!selected()) throw new Error("Choose an animation first."); openEditor(selected()); }));
  on(field("duplicate"), "click", safely(() => { const a = library.duplicateAnimation(chooser.getSelectedId()); chooser.select(a.id); openEditor(a); status("Created a separate custom copy."); }));
  on(field("editor-cancel"), "click", () => { editRevision++; stop(); field("form").hidden = true; });
  on(field("grid"), "change", () => {
    const custom = field("grid").value === "custom"; field("custom-grid").hidden = !custom;
    if (!custom) { field("columns").value = field("rows").value = field("grid").value; field("frames").value = Number(field("grid").value) ** 2; }
  });
  for (const axis of ["columns", "rows"]) on(field(axis), "input", () => { field("frames").value = Number(field("columns").value) * Number(field("rows").value); });
  on(field("file"), "change", safely(async () => {
    const file = field("file").files[0]; if (!file) return;
    if (!["image/png", "image/webp", "image/jpeg"].includes(file.type)) throw new Error("Choose a PNG, WebP or JPEG sprite sheet.");
    if (!file.size || file.size > MAX_UPLOAD_BYTES) throw new Error("Choose a sprite sheet smaller than 8 MB.");
    const current = ++editRevision;
    const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("The image could not be read.")); reader.readAsDataURL(file); });
    if (destroyed || current !== editRevision) return;
    draftSource = data; field("file-info").textContent = file.name; status("Sheet loaded. Choose its grid and preview before saving.");
  }));
  on(field("play"), "click", safely(() => play(selected())));
  on(field("replay"), "click", safely(() => play(selected())));
  on(field("stop"), "click", stop);
  on(field("draft-preview"), "click", safely(() => play(draft(), true)));
  on(field("form"), "submit", safely(async event => {
    event.preventDefault(); const a = draft(), current = ++editRevision;
    await preview.prepareAnimation(a);
    if (destroyed || current !== editRevision) return;
    const saved = editId ? library.updateAnimation(editId, a) : library.registerAnimation({ ...a, id: undefined });
    chooser.select(saved.id); assignmentInfo(); status("Animation saved for this session. Select an action and choose Change animation to assign it.");
  }));
  selectionChanged(); assignmentInfo();
  return { stop, close() { if (dialog.open) dialog.close(); else stop(); },
    destroy() { if (destroyed) return; destroyed = true; editRevision++; stop(); if (dialog.open) dialog.close(); chooser.destroy(); preview.destroy(); previewEngine.destroy(); listeners.forEach(remove => remove()); } };
}
