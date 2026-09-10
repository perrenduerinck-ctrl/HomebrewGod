import { MAX_UPLOAD_BYTES, normalizeAnimation, mergeAnimationDefinition } from "./animationLibrary.js";
import { createAnimationPlayer } from "./animationPlayer.js";
import { createBattleMapEffectEngine } from "./effectEngine.js";
import { createAnimationSelector } from "./animationBrowser.js";
import { animationFormMarkup, writeAnimationFields, readAnimationFields } from "./animationEditorFields.js";
import { ANIMATION_PRESETS } from "./animationPlayback.js";
import { inspectAnimationSprite, spriteCheckSummary } from "./animationSpriteCheck.js";
export { createAnimationSelector } from "./animationBrowser.js";

export function createAnimationEditor({ dialog, button, library, bindings, actions = [], isSoundEnabled }) {
  if (!dialog || !button) return { stop() {}, close() {}, destroy() {} };
  dialog.innerHTML = `<div class="hg-animation-heading"><div><span class="hg-animation-eyebrow">HOMEBREW GOD · VFX STUDIO</span><h2 id="animationLibraryTitle">Animation Creator</h2>
    <p>Find an effect. Make it yours.</p></div><button data-animation-close type="button" aria-label="Close animations">Close</button></div>
    <p class="hg-animation-session">Session workspace · Custom animations, favorites and assignments reset when you reload.</p>
    <div class="hg-animation-columns"><section class="hg-animation-settings"><div data-animation-browser-panel>
    <div data-animation-chooser></div><div class="hg-animation-buttons"><button data-animation-edit type="button">Edit settings</button><button data-animation-duplicate type="button">Duplicate / Remix</button>
    <button data-animation-custom type="button" class="hg-animation-primary">Custom Animation</button><button data-animation-delete type="button">Delete custom</button></div>
    <div class="hg-animation-assignment"><label>Assign to<select data-animation-action></select></label><p data-animation-assigned class="hg-animation-hint"></p>
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
    <details class="hg-animation-preview-tools"><summary>Preview Tools</summary><label class="hg-animation-toggle"><input data-animation-show-frame type="checkbox">Show frame number</label><label class="hg-animation-toggle"><input data-animation-show-bounds type="checkbox">Show bounding box</label><label class="hg-animation-toggle"><input data-animation-show-pivot type="checkbox">Show pivot</label><button type="button" data-animation-reset-tokens>Reset tokens</button></details>
    <p data-animation-preview-info class="hg-animation-hint"></p><p class="hg-animation-hint">Preview controls never change an assignment. Save your settings, then choose an action.</p></section></div>
    <p data-animation-status role="status"></p>`;
  const field = name => dialog.querySelector(`[data-animation-${name}]`), status = message => { field("status").textContent = message; };
  const surface = field("preview"), previewEngine = createBattleMapEffectEngine({ surface }), preview = createAnimationPlayer({ engine: previewEngine, library, isSoundEnabled, onError: () => {} });
  let previewRevision = 0, editRevision = 0, inspectionRevision = 0, editId = null, draftSource = "", draftSound = "", draftBase = null, imageInfo = null, destroyed = false, playback = null, paused = false;
  const points = { source: { x: .24, y: .52 }, target: { x: .76, y: .52 } };
  const listeners = [], on = (element, event, fn) => { element.addEventListener(event, fn); listeners.push(() => element.removeEventListener(event, fn)); };
  const safely = fn => async event => { try { await fn(event); } catch (e) { status(e.message || "The animation could not be updated."); } };
  function point(key) { return { x: points[key].x * surface.clientWidth, y: points[key].y * surface.clientHeight }; }
  function positionTokens() { for (const key of ["source", "target"]) { field(key).style.left = `${points[key].x * 100}%`; field(key).style.top = `${points[key].y * 100}%`; } }
  positionTokens();
  for (const key of ["source", "target"]) {
    const node = field(key); let dragging = null;
    on(node, "pointerdown", event => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); dragging = event.pointerId; node.setPointerCapture(event.pointerId); });
    on(node, "pointermove", event => {
      if (event.pointerId !== dragging) return; event.preventDefault(); event.stopPropagation(); const rect = surface.getBoundingClientRect();
      points[key] = { x: Math.max(.06, Math.min(.94, (event.clientX - rect.left) / rect.width)), y: Math.max(.12, Math.min(.85, (event.clientY - rect.top) / rect.height)) }; positionTokens();
    });
    on(node, "pointerup", event => { if (dragging === event.pointerId) { node.releasePointerCapture(event.pointerId); dragging = null; } });
    on(node, "pointercancel", () => { dragging = null; });
    on(node, "keydown", event => {
      const delta = { ArrowLeft: [-.025, 0], ArrowRight: [.025, 0], ArrowUp: [0, -.04], ArrowDown: [0, .04] }[event.key];
      if (!delta) return; event.preventDefault(); event.stopPropagation(); points[key].x = Math.max(.06, Math.min(.94, points[key].x + delta[0])); points[key].y = Math.max(.12, Math.min(.85, points[key].y + delta[1])); positionTokens();
    });
  }
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
    stop(); editRevision++; inspectionRevision++; editId = a?.id || null; draftBase = a; draftSource = a?.sprite || ""; draftSound = a?.sound?.src || ""; imageInfo = null;
    field("form").hidden = false; field("browser-panel").hidden = true; field("editor-title").textContent = a ? `Edit ${a.name}` : "Create animation";
    writeAnimationFields(field, a); field("advanced-mode").checked = false; field("preset").value = ""; field("file").value = field("sound-file").value = "";
    field("sound-info").textContent = draftSound ? "Current sound retained." : "No sound";
    const columns = a?.grid.columns || 6, rows = a?.grid.rows || 6;
    field("grid").value = columns === rows && [4,5,6,7,8].includes(columns) ? String(columns) : "custom";
    field("file-info").textContent = a ? "Current sheet retained. Upload to replace it." : "Choose a sheet. Transparent PNG is recommended.";
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
      x: surface.clientWidth / 2, y: surface.clientHeight / 2, sourcePoint: point("source"), targetPoint: point("target"),
      getSourcePoint: () => point("source"), getTargetPoint: () => point("target"), previewSpeed: Number(field("slow").value),
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
  on(button, "click", () => { dialog.showModal(); selectionChanged(); assignmentInfo(); });
  on(field("close"), "click", () => dialog.close());
  on(dialog, "keydown", event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); dialog.close(); } });
  on(dialog, "close", () => { stop(); editRevision++; inspectionRevision++; });
  on(field("action"), "change", assignmentInfo);
  on(field("assign"), "click", safely(() => {
    const id = chooser.getSelectedId(); if (!library.getAnimation(id)) throw new Error("Choose an animation first.");
    bindings.setAnimation(field("action").value, id); library.markUsed(id); assignmentInfo(); status("Animation changed for this session.");
  }));
  on(field("reset"), "click", safely(() => { bindings.setAnimation(field("action").value, null); assignmentInfo(); status("Original effect restored."); }));
  on(field("custom"), "click", () => openEditor());
  on(field("edit"), "click", safely(() => { if (!selected()) throw new Error("Choose an animation first."); openEditor(selected()); }));
  on(field("duplicate"), "click", safely(() => { const a = library.duplicateAnimation(chooser.getSelectedId()); chooser.select(a.id); openEditor(a); status("Created a separate custom remix."); }));
  on(field("delete"), "click", safely(() => { library.deleteAnimation(chooser.getSelectedId()); selectionChanged(); assignmentInfo(); status("Custom animation removed. Missing assignments use their original effect."); }));
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
  on(field("file"), "change", safely(async () => {
    const file = field("file").files[0]; if (!file) return;
    if (!["image/png", "image/webp", "image/jpeg"].includes(file.type)) throw new Error("Choose a PNG, WebP or JPEG sprite sheet.");
    const current = ++editRevision, data = await readFile(file);
    if (destroyed || current !== editRevision) return;
    draftSource = data; imageInfo = null; field("file-info").textContent = file.name; status("Sheet loaded. Checking its cells and transparency…"); syncControls(); await inspect(data);
  }));
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
  on(field("reset-tokens"), "click", () => { points.source = { x: .24, y: .52 }; points.target = { x: .76, y: .52 }; positionTokens(); });
  on(field("form"), "submit", safely(async event => {
    event.preventDefault(); const a = draft(), current = ++editRevision; await preview.prepareAnimation(a);
    if (destroyed || current !== editRevision) return;
    const saved = editId ? library.updateAnimation(editId, a) : library.registerAnimation({ ...a, id: undefined });
    chooser.select(saved.id); assignmentInfo(); status("Animation saved for this session. Select an action and choose Change animation to assign it.");
  }));
  selectionChanged(); assignmentInfo();
  return { stop, close() { if (dialog.open) dialog.close(); else stop(); },
    destroy() { if (destroyed) return; destroyed = true; editRevision++; inspectionRevision++; stop(); if (dialog.open) dialog.close(); chooser.destroy(); preview.destroy(); previewEngine.destroy(); listeners.forEach(remove => remove()); } };
}
