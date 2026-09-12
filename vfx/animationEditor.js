import { MAX_UPLOAD_BYTES, normalizeAnimation, mergeAnimationDefinition } from "./animationLibrary.js";
import { createAnimationPlayer } from "./animationPlayer.js";
import { createBattleMapEffectEngine } from "./effectEngine.js";
import { createAnimationSelector } from "./animationBrowser.js";
import { animationFormMarkup, writeAnimationFields, readAnimationFields } from "./animationEditorFields.js";
import { ANIMATION_PRESETS } from "./animationPlayback.js";
import { inspectAnimationSprite, spriteCheckSummary } from "./animationSpriteCheck.js";
import { createAnimationPreviewStage } from "./animationPreviewStage.js";
export { createAnimationSelector } from "./animationBrowser.js";

export function createAnimationEditor({ dialog, button, library, bindings, actions = [], isSoundEnabled, persistence = null }) {
  if (!dialog || !button) return { stop() {}, close() {}, destroy() {} };
  dialog.innerHTML = `<div class="hg-animation-heading"><div><span class="hg-animation-eyebrow">HOMEBREW GOD · VFX STUDIO</span><h2 id="animationLibraryTitle">Animation Creator</h2>
    <p>Find an effect. Make it yours.</p></div><button data-animation-close type="button" aria-label="Close animations">Close</button></div>
    <p class="hg-animation-session" data-animation-session>Personal animations sync after sign-in. Favorites and temporary action assignments remain session-only.</p>
    <div class="hg-animation-columns"><section class="hg-animation-settings"><div data-animation-browser-panel>
    <div data-animation-chooser></div><div class="hg-animation-buttons"><button data-animation-edit type="button">Edit settings</button><button data-animation-duplicate type="button">Duplicate / Remix</button>
    <button data-animation-custom type="button" class="hg-animation-primary">Custom Animation</button><button data-animation-delete type="button">Delete custom</button></div>
    <div data-animation-external hidden><p data-animation-external-label></p><button type="button" data-animation-use-selected>Use selected animation</button></div>
    <div data-animation-delete-warning hidden><p data-animation-delete-message></p><label>Replacement<select data-animation-delete-replacement></select></label><button type="button" data-animation-delete-replace>Replace references and delete</button><button type="button" data-animation-delete-remove>Remove references and delete</button><button type="button" data-animation-delete-cancel>Cancel</button></div>
    <div class="hg-animation-assignment" data-animation-assignment><label>Assign to<select data-animation-action></select></label><p data-animation-assigned class="hg-animation-hint"></p>
    <div class="hg-animation-buttons"><button data-animation-assign type="button">Change animation</button><button data-animation-reset type="button">Use original effect</button></div></div></div>
    <form data-animation-form hidden>${animationFormMarkup()}</form></section>
    <section class="hg-animation-preview-panel" aria-label="Animation preview"><div class="hg-animation-stage-heading"><h3>Preview Stage</h3><span>Drag the tokens</span></div>
    <div data-animation-preview class="hg-animation-preview" data-background="checker">
      <div class="hg-animation-stage-line"></div><button data-animation-source class="hg-animation-dummy hg-animation-source" type="button" aria-label="Source token, drag or use arrow keys"><span>S</span><small>Source</small></button>
      <button data-animation-target class="hg-animation-dummy hg-animation-target" type="button" aria-label="Target token, drag or use arrow keys"><span>T</span><small>Target</small></button>
      <output data-animation-frame-readout class="hg-animation-frame-readout" hidden>Frame —</output></div>
    <div class="hg-animation-transport"><button data-animation-play type="button" class="hg-animation-primary">▶ Play</button><button data-animation-pause type="button">Pause</button><button data-animation-stop type="button">Stop</button><button data-animation-replay type="button">Replay</button></div>
    <div class="hg-animation-preview-options"><label>Preview FPS<input data-animation-preview-fps type="number" min="1" max="60" value="24"></label><label>Preview scale<input data-animation-preview-scale type="number" min="0.1" max="8" step="0.1" value="1"></label></div>
    <div class="hg-animation-preview-options"><label>Slow motion<select data-animation-slow><option value="1">1×</option><option value="0.5">0.5×</option><option value="0.25">0.25×</option></select></label>
    <label>Background<select data-animation-background><option value="checker">Transparent checkerboard</option><option value="dark">Dark</option><option value="light">Light</option><option value="grid">Grid</option><option value="map">Map-style</option></select></label></div>
    <details class="hg-animation-preview-tools"><summary>Preview Tools</summary><label class="hg-animation-toggle"><input data-animation-show-frame type="checkbox">Show frame number</label><label class="hg-animation-toggle"><input data-animation-show-bounds type="checkbox">Show bounding box</label><label class="hg-animation-toggle"><input data-animation-show-pivot type="checkbox">Show pivot</label>
    <label class="hg-animation-toggle"><input data-animation-show-points type="checkbox">Show source, target, travel path and impact point</label>
    <label>Test distance<select data-animation-distance><option value="custom">Custom / drag anchors</option><option value="adjacent">Adjacent</option>${[5,10,30,60,120].map(n => `<option value="${n}">${n} ft</option>`).join("")}</select></label>
    <button type="button" data-animation-swap-tokens>Swap source / target</button><button type="button" data-animation-reset-tokens>Reset tokens</button>
    <div class="hg-animation-buttons">${[["source","Source Effect"],["target","Target Effect"],["projectile","Projectile"],["melee","Melee Directional"],["beam","Beam"],["aura","Aura"]].map(([key,name]) => `<button type="button" data-animation-quick="${key}">${name}</button>`).join("")}</div></details>
    <p data-animation-preview-info class="hg-animation-hint"></p><p class="hg-animation-hint">Preview controls never change an assignment. Save your settings, then choose an action.</p></section></div>
    <p data-animation-status role="status"></p>`;
  const field = name => dialog.querySelector(`[data-animation-${name}]`), status = message => { field("status").textContent = message; };
  const surface = field("preview"), previewEngine = createBattleMapEffectEngine({ surface }), preview = createAnimationPlayer({ engine: previewEngine, library, isSoundEnabled, onError: () => {} });
  let previewRevision = 0, editRevision = 0, inspectionRevision = 0, editId = null, draftSource = "", draftSound = "", draftBase = null, draftSpriteFile = null, imageInfo = null, destroyed = false, playback = null, paused = false;
  let external = null, deleteId = null, draftSaveId = null, saving = false;
  const listeners = [], on = (element, event, fn) => { element.addEventListener(event, fn); listeners.push(() => element.removeEventListener(event, fn)); };
  const safely = fn => async event => { try { await fn(event); } catch (e) { status(e.message || "The animation could not be updated."); } };
  const previewStage = createAnimationPreviewStage({
    surface,
    source: field("source"),
    target: field("target"),
    swapButton: field("swap-tokens"),
    resetButton: field("reset-tokens"),
    distanceSelect: field("distance"),
    widthFeet: 150,
  });
  const persistenceUnsubscribe = persistence?.subscribe?.(state => {
    field("session").textContent = state.message;
    field("session").dataset.state = state.state;
  }) || (() => {});
  function stop() { previewRevision++; preview.clear(); playback = null; paused = false; field("pause").textContent = "Pause"; field("preview-info").textContent = "Preview stopped."; }
  function selected() { return library.getAnimation(chooser.getSelectedId()); }
  function selectionChanged() {
    stop(); editRevision++; inspectionRevision++; field("form").hidden = true; field("browser-panel").hidden = false;
    const a = selected(); field("delete").disabled = !a || a.ownership.kind === "builtin";
    if (!a) { field("preview-info").textContent = "Choose an animation to preview."; return; }
    field("preview-fps").value = a.fps; field("preview-scale").value = a.scale;
    field("preview-info").textContent = `${a.grid.columns} × ${a.grid.rows} · ${a.frameCount} frames · ${a.type}`;
  }
  const chooser = createAnimationSelector({ container: field("chooser"), library, onSelect: selectionChanged });
  field("action").replaceChildren(...actions.map(a => new Option(a.name, a.key)));
  function assignmentInfo() { const id = bindings.getAssignment(field("action").value)?.animationId; field("assigned").textContent = id ? `Assigned: ${library.getAnimation(id)?.name || "Unavailable animation"}` : "Assigned: original effect"; }
  function syncControls() {
    field("form").dataset.advanced = String(field("advanced-mode").checked);
    field("custom-grid").hidden = field("grid").value !== "custom";
    field("axis-scale").hidden = field("lock").checked;
    field("projectile-fields").hidden = field("behavior").value !== "projectile"; field("beam-fields").hidden = field("behavior").value !== "beam";
    field("tint-fields").hidden = !field("tint-enabled").checked;
    for (const output of dialog.querySelectorAll("[data-animation-value-for]")) output.textContent = field(output.dataset.animationValueFor).value;
    for (const anchor of dialog.querySelectorAll("[data-anchor]")) anchor.setAttribute("aria-pressed", String(anchor.dataset.anchor === `${Number(field("anchor-x").value)},${Number(field("anchor-y").value)}`));
    const sequence = field("sequence").value.trim();
    field("sheet-stats").textContent = spriteCheckSummary(imageInfo, Number(field("columns").value), Number(field("rows").value), sequence ? sequence.split(",").length : Number(field("frames").value), Number(field("end").value));
  }
  async function inspect(src) {
    const current = ++inspectionRevision;
    try { const result = await inspectAnimationSprite(src); if (!destroyed && current === inspectionRevision) { imageInfo = result; syncControls(); } }
    catch (error) { if (!destroyed && current === inspectionRevision) { imageInfo = null; field("sheet-stats").textContent = error.message; status(error.message); } }
  }
  function openEditor(a = null) {
    draftSaveId = null;
    stop(); editRevision++; inspectionRevision++; editId = a?.id || null; draftBase = a; draftSource = a?.sprite || ""; draftSound = a?.sound?.src || ""; draftSpriteFile = null; imageInfo = null;
    field("form").hidden = false; field("browser-panel").hidden = true; field("editor-title").textContent = a ? `Edit ${a.name}` : "Create animation";
    writeAnimationFields(field, a); field("advanced-mode").checked = false; field("preset").value = ""; field("file").value = field("sound-file").value = "";
    field("sound-info").textContent = draftSound ? "Current sound retained." : "No sound";
    const columns = a?.grid.columns || 6, rows = a?.grid.rows || 6;
    field("grid").value = columns === rows && [4,5,6,7,8].includes(columns) ? String(columns) : "custom";
    field("file-info").textContent = a ? "Current sheet retained. Upload to replace it." : "Choose a sheet. Transparent PNG is recommended.";
    field("upload-thumbnail").hidden = !draftSource; if (draftSource) field("upload-thumbnail").src = draftSource; else field("upload-thumbnail").removeAttribute("src");
    syncControls(); if (draftSource) inspect(draftSource); field("name").focus();
  }
  function draft() {
    const changes = readAnimationFields(field); changes.sound = draftSound ? { ...changes.sound, src: draftSound } : null;
    changes.sprite = draftSource; changes.id = editId || "draft_preview";
    return draftBase ? mergeAnimationDefinition(draftBase, changes) : normalizeAnimation(changes);
  }
  async function play(definition, fromDraft = false) {
    stop(); const current = previewRevision;
    if (!definition) throw new Error("Choose an animation first.");
    if (fromDraft) { field("preview-fps").value = definition.fps; field("preview-scale").value = definition.scale; }
    const result = await preview.previewAnimation(definition, {
      ...previewStage.getContext({ debugPoints: field("show-points").checked }),
      debugPoints: field("show-points").checked, previewSpeed: Number(field("slow").value),
      ...(fromDraft ? {} : { fps: Number(field("preview-fps").value), scale: Number(field("preview-scale").value) }),
      onFrame: state => { if (current === previewRevision) { const text = `Frame ${state.frame + 1} / ${definition.grid.columns * definition.grid.rows}`; if (field("frame-readout").textContent !== text) field("frame-readout").textContent = text; } }
    });
    if (current !== previewRevision) { result.cancel?.(); return; }
    if (!result.ok) throw new Error(result.message || "The animation could not be played.");
    playback = result;
    field("preview-info").textContent = `${definition.frames.sequence.length || definition.frameCount} frames · ${field("preview-fps").value} FPS · ${definition.loop ? "Loops until Stop" : definition.playback === "hold" || definition.placement.persist ? "Holds until Stop / duration ends" : definition.timing.loopCount > 1 && ["loop", "pingpong"].includes(definition.playback) ? `${definition.timing.loopCount} cycles` : "Plays once"}`;
    result.finished.then(() => { if (current === previewRevision) { playback = null; paused = false; field("pause").textContent = "Pause"; field("preview-info").textContent += " · Finished"; } });
    status(fromDraft ? "Previewing unsaved settings." : "Preview only. Assignments are unchanged.");
  }
  function playCurrent() { return field("form").hidden ? play(selected()) : play(draft(), true); }
  async function readFile(file) {
    if (!file.size || file.size > MAX_UPLOAD_BYTES) throw new Error("Choose a file smaller than 8 MB.");
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error("The file could not be read.")); reader.readAsDataURL(file); });
  }
  function finishExternal(id = null) { const request = external; external = null; request?.resolve(id); field("external").hidden = true; field("assignment").hidden = false; }
  on(button, "click", safely(async () => { finishExternal(); dialog.showModal(); selectionChanged(); assignmentInfo(); await persistence?.load?.(); }));
  on(field("close"), "click", () => dialog.close());
  on(dialog, "keydown", event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); dialog.close(); } });
  on(dialog, "close", () => { finishExternal(); stop(); editRevision++; inspectionRevision++; });
  on(field("use-selected"), "click", safely(() => { const a = selected(); if (!a) throw new Error("Choose an animation first."); finishExternal(a.id); dialog.close(); }));
  on(field("action"), "change", assignmentInfo);
  on(field("assign"), "click", safely(() => {
    const id = chooser.getSelectedId(); if (!library.getAnimation(id)) throw new Error("Choose an animation first.");
    bindings.setAnimation(field("action").value, id); library.markUsed(id); assignmentInfo(); status("Animation changed for this session.");
  }));
  on(field("reset"), "click", safely(() => { bindings.setAnimation(field("action").value, null); assignmentInfo(); status("Original effect restored."); }));
  on(field("custom"), "click", () => openEditor());
  on(field("edit"), "click", safely(() => { if (!selected()) throw new Error("Choose an animation first."); openEditor(selected()); }));
  on(field("duplicate"), "click", safely(() => { const a = library.duplicateAnimation(chooser.getSelectedId()); chooser.select(a.id); openEditor(a); status("Created a separate custom remix."); }));
  async function removeAnimation(options = {}) {
    const removedId = deleteId;
    library.validateDelete(removedId, options);
    if (library.getAnimation(removedId)?.ownership.scope === "user") {
      const synced = await persistence?.deleteAnimation?.(removedId);
      if (!synced?.ok) throw new Error("Sign in again before deleting this animation. Its definition and references are unchanged.");
    }
    library.deleteAnimation(removedId, options);
    field("delete-warning").hidden = true; deleteId = null; selectionChanged(); assignmentInfo(); status("Custom animation removed. References updated.");
  }
  on(field("delete"), "click", safely(() => {
    deleteId = chooser.getSelectedId(); const used = library.getAnimationUsage(deleteId);
    if (!used.length) return removeAnimation();
    field("delete-warning").hidden = false; field("delete-message").textContent = `This animation is used by ${used.length} abilities: ${used.map(x => x.name).join(", ")}.`;
    field("delete-replacement").replaceChildren(...library.list().filter(a => a.id !== deleteId).map(a => new Option(a.name, a.id)));
  }));
  on(field("delete-replace"), "click", safely(() => removeAnimation({ replaceWith: field("delete-replacement").value })));
  on(field("delete-remove"), "click", safely(() => removeAnimation({ removeReferences: true })));
  on(field("delete-cancel"), "click", () => { deleteId = null; field("delete-warning").hidden = true; });
  on(field("editor-cancel"), "click", selectionChanged);
  on(field("form"), "input", syncControls); on(field("form"), "change", syncControls);
  on(field("form"), "click", event => {
    const anchor = event.target.closest("[data-anchor]"); if (anchor) { const [x, y] = anchor.dataset.anchor.split(","); field("anchor-x").value = x; field("anchor-y").value = y; syncControls(); }
    const tag = event.target.closest("[data-add-tag]"); if (tag) { const tags = new Set(field("tags").value.split(",").map(t => t.trim()).filter(Boolean)); tags.add(tag.dataset.addTag); field("tags").value = [...tags].join(", "); }
  });
  on(field("grid"), "change", () => {
    if (field("grid").value !== "custom") { field("columns").value = field("rows").value = field("grid").value; resetFrames(); } syncControls();
  });
  function resetFrames() { field("start").value = 0; field("frames").value = Math.min(240, Number(field("columns").value) * Number(field("rows").value)); field("end").value = Number(field("frames").value) - 1; syncControls(); }
  for (const key of ["columns", "rows"]) on(field(key), "input", resetFrames);
  for (const key of ["start", "frames"]) on(field(key), "input", () => { field("end").value = Number(field("start").value) + Number(field("frames").value) - 1; syncControls(); });
  on(field("end"), "input", () => { field("frames").value = Number(field("end").value) - Number(field("start").value) + 1; syncControls(); });
  on(field("playback"), "change", () => { field("loops").value = field("playback").value === "loop" ? "0" : "1"; });
  on(field("apply-preset"), "click", safely(() => {
    const preset = ANIMATION_PRESETS[field("preset").value]; if (!preset) throw new Error("Choose a preset first.");
    // A preset changes behavior starting values while retaining the uploaded sheet,
    // identity, frame range and any previous appearance customization.
    const settings = readAnimationFields(field), identity = { name: settings.name || preset.name, sprite: draftSource || "draft.png", id: editId || "draft_preview", sound: null };
    const base = normalizeAnimation({ ...settings, ...identity });
    const reset = mergeAnimationDefinition(base, { playback: "once", timing: { loopCount: 1 }, behavior: "static", placement: { spawnAt: "map", followSource: false, followTarget: false, persist: false, duration: 0 }, direction: { mode: "fixed" } });
    const changed = mergeAnimationDefinition(reset, { ...preset, name: settings.name || preset.name });
    writeAnimationFields(field, changed); syncControls(); status(`${preset.name} starting values applied. Every setting can still be changed.`);
  }));
  async function loadSprite(file) {
    if (!file) return;
    if (!["image/png", "image/webp", "image/jpeg"].includes(file.type)) throw new Error("Choose a PNG, WebP or JPEG sprite sheet.");
    const current = ++editRevision, data = await readFile(file);
    if (destroyed || current !== editRevision) return;
    draftSource = data; draftSpriteFile = file; imageInfo = null; field("file-info").textContent = file.name; field("upload-thumbnail").src = data; field("upload-thumbnail").hidden = false; status("Sheet loaded. Checking its cells and transparency…"); syncControls(); await inspect(data);
  }
  on(field("file"), "change", safely(() => loadSprite(field("file").files[0])));
  on(field("upload-zone"), "dragover", event => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; });
  on(field("upload-zone"), "drop", safely(event => { event.preventDefault(); return loadSprite(event.dataTransfer.files[0]); }));
  on(field("replace-sprite"), "click", () => field("file").click());
  on(field("sound-file"), "change", safely(async () => {
    const file = field("sound-file").files[0]; if (!file) return;
    if (!/^audio\/(mpeg|mp3|wav|x-wav|ogg|webm|mp4)$/.test(file.type)) throw new Error("Choose an MP3, WAV, OGG or WebM sound.");
    const current = editRevision, data = await readFile(file); if (destroyed || current !== editRevision) return;
    draftSound = data; field("sound-info").textContent = file.name;
  }));
  on(field("sound-clear"), "click", () => { draftSound = ""; field("sound-file").value = ""; field("sound-info").textContent = "No sound"; });
  on(field("play"), "click", safely(playCurrent)); on(field("replay"), "click", safely(playCurrent)); on(field("stop"), "click", stop);
  on(field("pause"), "click", () => { if (!playback) return; paused = !paused; if (paused) playback.pause(); else playback.resume(); field("pause").textContent = paused ? "Resume" : "Pause"; });
  on(field("draft-preview"), "click", safely(() => play(draft(), true)));
  on(field("background"), "change", () => { surface.dataset.background = field("background").value; });
  on(field("show-frame"), "change", () => { field("frame-readout").hidden = !field("show-frame").checked; });
  on(field("show-bounds"), "change", () => { surface.classList.toggle("show-animation-bounds", field("show-bounds").checked); });
  on(field("show-pivot"), "change", () => { surface.classList.toggle("show-animation-pivot", field("show-pivot").checked); });
  on(field("show-points"), "change", safely(() => { if (playback) return playCurrent(); }));
  on(field("distance"), "change", () => {
    status(`Preview distance: ${Math.round(previewStage.getState().distanceFeet)} ft. Visual distance only.`);
  });
  for (const node of dialog.querySelectorAll("[data-animation-quick]")) on(node, "click", safely(() => {
    const key = node.dataset.animationQuick, a = field("form").hidden ? selected() : draft();
    const mode = { source: "SOURCE", target: "TARGET", projectile: "SOURCE_TO_TARGET", melee: "SOURCE_TOWARD_TARGET", beam: "MIDPOINT", aura: "SOURCE" }[key];
    return play(mergeAnimationDefinition(a, { behavior: ["projectile", "beam", "melee"].includes(key) ? key : "static", placement: { mode, followSource: key === "aura", followTarget: false }, direction: { mode: "face-target" }, ...(key === "aura" ? { playback: "loop" } : {}) }), true);
  }));
  on(field("form"), "submit", safely(async event => {
    event.preventDefault(); if (saving) return;
    saving = true;
    try {
      const a = draft(), current = ++editRevision; await preview.prepareAnimation(a);
      if (destroyed || current !== editRevision) return;
      const prepared = draftBase?.ownership.kind === "builtin"
        ? { definition: a, asset: null, persistent: false }
        : await persistence?.prepareAnimation?.(a, { spriteFile: draftSpriteFile }) || { definition: a, asset: null, persistent: false };
      if (destroyed || current !== editRevision) return;
      // Validate without changing the visible library or spell references first.
      const candidate = library.prepareAnimationSave({ ...prepared.definition, ...(editId ? {} : { id: draftSaveId || undefined }) }, { animationId: editId });
      draftSaveId = candidate.id;
      if (prepared.persistent) {
        const synced = await persistence.saveAnimation(candidate, { asset: prepared.asset });
        if (!synced.ok) throw new Error("Sign in again to save this animation. Your previous animation is unchanged.");
        if (candidate.ownership.ownerId !== library.getContext().ownerId) throw new Error("Account changed while saving. Reopen the library for your current account before assigning an animation.");
      }
      if (destroyed || current !== editRevision) return;
      const saved = editId ? library.updateAnimation(editId, prepared.definition) : library.registerAnimation(candidate);
      if (destroyed || current !== editRevision) return;
      if (external) { finishExternal(saved.id); dialog.close(); return; }
      chooser.select(saved.id); assignmentInfo(); status(prepared.persistent ? "Animation saved to your personal library. Select an action to assign it." : "Animation saved for this session. Sign in to sync it.");
    } finally { saving = false; }
  }));
  selectionChanged(); assignmentInfo();
  return { stop, async openForSlot({ slot = "impact", mode = "choose", animationId } = {}) {
      finishExternal(); if (!dialog.open) dialog.showModal(); selectionChanged(); await persistence?.load?.();
      field("external").hidden = false; field("assignment").hidden = true; field("external-label").textContent = `Choose an animation for ${slot}.`;
      if (animationId && library.getAnimation(animationId)) chooser.select(animationId);
      const promise = new Promise(resolve => { external = { resolve }; });
      if (mode === "create" || mode === "upload") { openEditor(); field("spawn").value = slot === "cast" ? "source" : slot === "travel" ? "source-to-target" : "target"; field("behavior").value = slot === "travel" ? "projectile" : "static"; syncControls(); if (mode === "upload") field("file").click(); }
      if (mode === "remix" && selected()) { const a = library.duplicateAnimation(selected().id); chooser.select(a.id); openEditor(a); }
      return promise;
    }, close() { if (dialog.open) dialog.close(); else stop(); },
    destroy() { if (destroyed) return; destroyed = true; editRevision++; inspectionRevision++; stop(); if (dialog.open) dialog.close(); chooser.destroy(); previewStage.destroy(); persistenceUnsubscribe(); preview.destroy(); previewEngine.destroy(); listeners.forEach(remove => remove()); } };
}
