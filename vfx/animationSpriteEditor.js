import { analyzeAnimationSprite, getSpriteGridSuggestions, trimEmptyFrameSelection } from "./animationSpriteCheck.js";
import { createUniformSpriteAtlas, getSpriteAtlasAlignment, getSpriteAtlasFrameBounds, resetSpriteAtlasAlignment } from "./spriteAtlas.js";

const MAX_VISUAL_CELLS = 576;
const MAX_SEQUENCE_FRAMES = 240;
const integer = (value, fallback = 0) => Number.isInteger(Number(value)) ? Number(value) : fallback;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const frameRange = (start, end) => Array.from({ length: Math.min(MAX_SEQUENCE_FRAMES, Math.max(0, end - start + 1)) }, (_, index) => start + index);

function parsedSequence(value, total) {
  if (!String(value || "").trim()) return [];
  return [...new Set(String(value).split(",").map(part => Number(part.trim())).filter(frame => Number.isInteger(frame) && frame >= 0 && frame < total))].slice(0, MAX_SEQUENCE_FRAMES);
}

export function createAnimationSpriteEditor({ field, listen, changed = () => {}, status = () => {} }) {
  let source = "", image = null, analysis = analyzeAnimationSprite(null, 1, 1), selectedFrame = 0;
  let imageVersion = 0, analysisSignature = "", gridSignature = "", suggestionSignature = "";
  let storedAtlas = null, baseInset = 0, alignmentDirty = false;
  let alignment = { offsetX: 0, offsetY: 0, insetX: 0, insetY: 0 };
  let drag = null;

  function gridState() {
    const columns = Math.max(1, integer(field("columns").value, 1));
    const rows = Math.max(1, integer(field("rows").value, 1));
    return { columns, rows, total: columns * rows };
  }

  function playbackFrames() {
    const { total } = gridState(), sequence = parsedSequence(field("sequence").value, total);
    if (sequence.length) return sequence;
    const start = clamp(integer(field("start").value), 0, total - 1);
    const end = clamp(integer(field("end").value, start), start, total - 1);
    return frameRange(start, end);
  }

  function writeFrames(frames) {
    const { total } = gridState();
    frames = [...new Set(frames.map(Number).filter(frame => Number.isInteger(frame) && frame >= 0 && frame < total))];
    if (!frames.length) { status("Keep at least one frame enabled."); return false; }
    if (frames.length > MAX_SEQUENCE_FRAMES) { status(`Choose no more than ${MAX_SEQUENCE_FRAMES} frames.`); return false; }
    const minimum = Math.min(...frames), maximum = Math.max(...frames);
    const contiguous = frames.length === maximum - minimum + 1 && frames.every((frame, index) => frame === minimum + index);
    field("start").value = String(minimum); field("end").value = String(maximum); field("frames").value = String(maximum - minimum + 1);
    field("sequence").value = contiguous ? "" : frames.join(", ");
    selectedFrame = clamp(selectedFrame, minimum, maximum); changed(); return true;
  }

  function atlasBase() {
    const { columns, rows } = gridState();
    if (storedAtlas && storedAtlas.columns?.length === columns + 1 && storedAtlas.rows?.length === rows + 1 &&
      (!image || storedAtlas.width === image.width && storedAtlas.height === image.height)) return storedAtlas;
    if (!image?.width || !image?.height) return storedAtlas;
    return createUniformSpriteAtlas(image.width, image.height, columns, rows);
  }

  function currentAtlas() {
    const atlas = atlasBase();
    return atlas ? { ...atlas, inset: baseInset, ...alignment } : null;
  }

  function hasCustomAlignment() {
    return alignment.offsetX !== 0 || alignment.offsetY !== 0 || alignment.insetX !== baseInset || alignment.insetY !== baseInset;
  }

  function metadata() {
    const atlas = currentAtlas();
    return { inset: baseInset, atlas: atlas && (storedAtlas || alignmentDirty || hasCustomAlignment()) ? atlas : null };
  }

  function syncAlignmentInputs() {
    field("grid-offset-x").value = String(alignment.offsetX);
    field("grid-offset-y").value = String(alignment.offsetY);
    field("frame-inset-x").value = String(alignment.insetX);
    field("frame-inset-y").value = String(alignment.insetY);
  }

  function readAlignmentInputs() {
    alignment = {
      offsetX: clamp(integer(field("grid-offset-x").value), -16384, 16384),
      offsetY: clamp(integer(field("grid-offset-y").value), -16384, 16384),
      insetX: clamp(integer(field("frame-inset-x").value), 0, 64),
      insetY: clamp(integer(field("frame-inset-y").value), 0, 64)
    };
    alignmentDirty = true;
  }

  function write(atlas = null, inset = 0) {
    storedAtlas = atlas ? { ...atlas, columns: [...atlas.columns], rows: [...atlas.rows] } : null;
    baseInset = clamp(integer(inset ?? atlas?.inset), 0, 64);
    alignment = { ...getSpriteAtlasAlignment(storedAtlas, baseInset) };
    alignmentDirty = false;
    field("edit-frame-boxes").checked = false;
    field("neighbor-bleed").checked = false;
    syncAlignmentInputs();
  }

  function resetAlignment() {
    const reset = resetSpriteAtlasAlignment(currentAtlas() || {}, baseInset);
    alignment = { offsetX: reset.offsetX, offsetY: reset.offsetY, insetX: reset.insetX, insetY: reset.insetY };
    alignmentDirty = Boolean(storedAtlas);
    syncAlignmentInputs(); updateFramePreview(); changed();
    status("Frame alignment reset to the original grid. The sprite image was not changed.");
  }

  function resetGrid() {
    storedAtlas = null; baseInset = 0; alignmentDirty = false;
    alignment = { offsetX: 0, offsetY: 0, insetX: 0, insetY: 0 };
    syncAlignmentInputs();
  }

  function frameDiagnostics(index) {
    return analysis.frames[index] || null;
  }

  function percent(value, extent) {
    return `${value / extent * 100}%`;
  }

  function positionBox(node, bounds, atlas) {
    node.style.left = percent(bounds.left, atlas.width);
    node.style.top = percent(bounds.top, atlas.height);
    node.style.width = percent(bounds.right - bounds.left, atlas.width);
    node.style.height = percent(bounds.bottom - bounds.top, atlas.height);
  }

  function renderBleedDiagnostic(bounds, atlas) {
    const enabled = field("neighbor-bleed").checked;
    const intendedNode = field("frame-intended"), sampledNode = field("frame-sampled"), bands = field("neighbor-bleed-bands"), summary = field("neighbor-bleed-summary");
    intendedNode.hidden = sampledNode.hidden = bands.hidden = summary.hidden = !enabled || !bounds;
    field("frame-crop-art").classList.toggle("show-neighbor-bleed", enabled && Boolean(bounds));
    if (!enabled || !bounds) return;
    positionBox(intendedNode, bounds.intended, atlas); positionBox(sampledNode, bounds.sample, atlas);
    bands.replaceChildren();
    const addBand = rectangle => {
      if (rectangle.right <= rectangle.left || rectangle.bottom <= rectangle.top) return;
      const node = document.createElement("i"); positionBox(node, rectangle, atlas); bands.append(node);
    };
    const sample = bounds.sample, intended = bounds.intended;
    addBand({ left: sample.left, right: Math.min(sample.right, intended.left), top: sample.top, bottom: sample.bottom });
    addBand({ left: Math.max(sample.left, intended.right), right: sample.right, top: sample.top, bottom: sample.bottom });
    addBand({ left: Math.max(sample.left, intended.left), right: Math.min(sample.right, intended.right), top: sample.top, bottom: Math.min(sample.bottom, intended.top) });
    addBand({ left: Math.max(sample.left, intended.left), right: Math.min(sample.right, intended.right), top: Math.max(sample.top, intended.bottom), bottom: sample.bottom });
    const crossings = Object.entries(bounds.bleed).filter(([, pixels]) => pixels > 0).map(([side, pixels]) => `${side} ${Math.round(pixels)}px`);
    summary.textContent = `${Math.round(bounds.width)} × ${Math.round(bounds.height)}px sampled frame · ${crossings.length ? `neighbor crossing: ${crossings.join(" / ")}` : "no neighboring cell crossed"}. Red marks sampled pixels outside the intended cell.`;
  }

  function renderAlignmentOverlay(atlas) {
    const editing = field("edit-frame-boxes").checked;
    field("frame-alignment-controls").hidden = !editing;
    field("sheet-grid-wrap").classList.toggle("editing-frame-boxes", editing);
    const overlay = field("frame-alignment-overlay"); overlay.hidden = !editing || !atlas;
    if (!editing || !atlas) return;
    overlay.replaceChildren();
    for (const boundary of atlas.columns) {
      const line = document.createElement("i"); line.className = "hg-animation-atlas-line hg-animation-atlas-line-x";
      line.style.left = percent(boundary + alignment.offsetX, atlas.width); overlay.append(line);
    }
    for (const boundary of atlas.rows) {
      const line = document.createElement("i"); line.className = "hg-animation-atlas-line hg-animation-atlas-line-y";
      line.style.top = percent(boundary + alignment.offsetY, atlas.height); overlay.append(line);
    }
  }

  function updateFramePreview() {
    const { columns, rows, total } = gridState();
    selectedFrame = clamp(selectedFrame, 0, Math.max(0, total - 1));
    const column = selectedFrame % columns, row = Math.floor(selectedFrame / columns), atlas = currentAtlas();
    const bounds = atlas ? getSpriteAtlasFrameBounds(atlas, column, row, { fallbackInset: baseInset }) : null;
    field("frame-scrubber").max = String(Math.max(0, total - 1)); field("frame-scrubber").value = String(selectedFrame);
    field("frame-position").textContent = `FRAME ${selectedFrame + 1} / ${total}`;
    const art = field("frame-crop-art");
    art.style.backgroundImage = source ? `url(${JSON.stringify(source)})` : "";
    if (bounds && atlas) {
      art.style.backgroundSize = `${atlas.width / bounds.width * 100}% ${atlas.height / bounds.height * 100}%`;
      art.style.backgroundPosition = `${atlas.width === bounds.width ? 0 : bounds.x / (atlas.width - bounds.width) * 100}% ${atlas.height === bounds.height ? 0 : bounds.y / (atlas.height - bounds.height) * 100}%`;
      art.style.aspectRatio = `${bounds.width} / ${bounds.height}`;
    } else {
      art.style.backgroundSize = `${columns * 100}% ${rows * 100}%`;
      art.style.backgroundPosition = `${columns === 1 ? 0 : column / (columns - 1) * 100}% ${rows === 1 ? 0 : row / (rows - 1) * 100}%`;
      if (image?.width && image?.height) art.style.aspectRatio = `${image.width / columns} / ${image.height / rows}`;
    }
    const diagnostic = frameDiagnostics(selectedFrame), contentBounds = diagnostic?.bounds;
    const outline = field("frame-content-bounds"), showCrop = field("frame-crop-toggle").checked;
    outline.hidden = !showCrop || !contentBounds;
    if (contentBounds) {
      outline.style.left = `${contentBounds.left * 100}%`; outline.style.top = `${contentBounds.top * 100}%`;
      outline.style.width = `${(contentBounds.right - contentBounds.left) * 100}%`; outline.style.height = `${(contentBounds.bottom - contentBounds.top) * 100}%`;
    }
    field("frame-padding").hidden = !showCrop;
    field("frame-padding").textContent = !analysis.available ? "Transparency unavailable; full cell shown."
      : diagnostic?.empty ? "Blank frame."
      : `Visible ${(diagnostic.coverage * 100).toFixed(1)}% · padding L ${Math.round(contentBounds.left * 100)}% / R ${Math.round((1 - contentBounds.right) * 100)}% / T ${Math.round(contentBounds.top * 100)}% / B ${Math.round((1 - contentBounds.bottom) * 100)}%`;
    for (const button of field("frame-grid").querySelectorAll("[data-frame-preview]")) button.dataset.previewing = String(Number(button.dataset.framePreview) === selectedFrame);
    renderAlignmentOverlay(atlas); renderBleedDiagnostic(bounds, atlas);
  }

  function updateSelection() {
    const enabled = new Set(playbackFrames());
    for (const checkbox of field("frame-grid").querySelectorAll("[data-frame-enabled]")) {
      checkbox.checked = enabled.has(Number(checkbox.dataset.frameEnabled));
      checkbox.closest(".hg-animation-frame-cell").dataset.enabled = String(checkbox.checked);
    }
    field("frame-selection-summary").textContent = `${enabled.size} enabled · ${analysis.emptyFrames.length} blank · ${analysis.mostlyTransparentFrames.length} mostly transparent`;
    field("trim-empty").disabled = !analysis.available || !analysis.emptyFrames.length;
  }

  function renderGrid() {
    const { columns, rows, total } = gridState(), signature = `${imageVersion}:${columns}:${rows}:${source ? 1 : 0}`;
    field("sheet-editor").hidden = !source;
    if (!source) return;
    field("sheet-grid-image").src = source;
    field("sheet-grid-label").textContent = `${columns} columns × ${rows} rows · ${total} cells`;
    if (signature !== gridSignature) {
      gridSignature = signature; const grid = field("frame-grid"); grid.replaceChildren();
      grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
      if (total <= MAX_VISUAL_CELLS) for (let index = 0; index < total; index++) {
        const diagnostic = frameDiagnostics(index), cell = document.createElement("span"); cell.className = "hg-animation-frame-cell";
        cell.dataset.empty = String(diagnostic?.empty === true); cell.dataset.transparent = String(diagnostic?.mostlyTransparent === true);
        const preview = document.createElement("button"); preview.type = "button"; preview.dataset.framePreview = String(index); preview.textContent = String(index);
        preview.setAttribute("aria-label", `Preview frame ${index}`);
        const label = document.createElement("label"); label.title = `Include frame ${index}`;
        const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.dataset.frameEnabled = String(index); checkbox.setAttribute("aria-label", `Include frame ${index}`);
        label.append(checkbox); cell.append(preview, label); grid.append(cell);
      } else {
        const message = document.createElement("span"); message.className = "hg-animation-grid-limit";
        message.textContent = `Visual selection is limited to ${MAX_VISUAL_CELLS} cells. The existing frame range fields remain available.`; grid.append(message);
      }
    }
    updateSelection(); updateFramePreview();
  }

  function renderSuggestions() {
    const signature = `${imageVersion}:${image?.width || 0}:${image?.height || 0}`;
    if (signature === suggestionSignature) return;
    suggestionSignature = signature; const root = field("grid-suggestions"); root.replaceChildren();
    for (const suggestion of getSpriteGridSuggestions(image)) {
      const button = document.createElement("button"); button.type = "button"; button.dataset.gridSuggestion = String(suggestion.columns);
      button.textContent = `${suggestion.columns}×${suggestion.rows}${suggestion.exact ? " · clean division" : ""}`;
      button.title = `${suggestion.cellWidth.toFixed(1)} × ${suggestion.cellHeight.toFixed(1)} pixel cells. Apply only when selected.`; root.append(button);
    }
  }

  function sync({ src = source, imageInfo = image } = {}) {
    if (src !== source) { source = src || ""; gridSignature = ""; }
    if (imageInfo !== image) { image = imageInfo || null; imageVersion++; analysisSignature = gridSignature = suggestionSignature = ""; }
    const { columns, rows } = gridState();
    const nextAnalysis = `${imageVersion}:${columns}:${rows}`;
    if (nextAnalysis !== analysisSignature) { analysisSignature = nextAnalysis; analysis = analyzeAnimationSprite(image, columns, rows); gridSignature = ""; }
    renderSuggestions(); renderGrid();
    return analysis;
  }

  listen(field("frame-grid"), "click", event => {
    const button = event.target.closest("[data-frame-preview]"); if (!button) return;
    selectedFrame = Number(button.dataset.framePreview); updateFramePreview();
  });
  listen(field("frame-grid"), "input", event => {
    const checkbox = event.target.closest("[data-frame-enabled]"); if (!checkbox) return;
    event.stopPropagation();
    const frame = Number(checkbox.dataset.frameEnabled), frames = playbackFrames();
    if (checkbox.checked) { if (!frames.includes(frame)) frames.push(frame); frames.sort((a, b) => a - b); }
    else frames.splice(frames.indexOf(frame), frames.includes(frame) ? 1 : 0);
    if (!writeFrames(frames)) checkbox.checked = true;
  });
  listen(field("frame-grid"), "change", event => { if (event.target.closest("[data-frame-enabled]")) event.stopPropagation(); });
  listen(field("grid-suggestions"), "click", event => {
    const button = event.target.closest("[data-grid-suggestion]"); if (!button) return;
    const size = Number(button.dataset.gridSuggestion); field("grid").value = String(size); field("columns").value = field("rows").value = String(size);
    field("start").value = "0"; field("frames").value = String(Math.min(MAX_SEQUENCE_FRAMES, size * size)); field("end").value = String(Math.min(MAX_SEQUENCE_FRAMES, size * size) - 1); field("sequence").value = "";
    selectedFrame = 0; gridSignature = ""; resetGrid(); changed(); status(`${size}×${size} grid applied. The uploaded artwork was not changed.`);
  });
  listen(field("frame-first"), "click", () => { selectedFrame = 0; updateFramePreview(); });
  listen(field("frame-previous"), "click", () => { selectedFrame--; updateFramePreview(); });
  listen(field("frame-next"), "click", () => { selectedFrame++; updateFramePreview(); });
  listen(field("frame-last"), "click", () => { selectedFrame = gridState().total - 1; updateFramePreview(); });
  listen(field("frame-scrubber"), "input", () => { selectedFrame = Number(field("frame-scrubber").value); updateFramePreview(); });
  listen(field("frame-crop-toggle"), "change", updateFramePreview);
  listen(field("neighbor-bleed"), "change", updateFramePreview);
  listen(field("edit-frame-boxes"), "change", updateFramePreview);
  for (const key of ["grid-offset-x", "grid-offset-y", "frame-inset-x", "frame-inset-y"]) listen(field(key), "input", () => { readAlignmentInputs(); updateFramePreview(); });
  listen(field("frame-alignment-controls"), "click", event => {
    if (event.target.closest("[data-animation-reset-alignment]")) { resetAlignment(); return; }
    const button = event.target.closest("[data-animation-frame-nudge]"); if (!button) return;
    const amount = event.shiftKey ? 5 : 1, direction = button.dataset.animationFrameNudge;
    if (direction === "left") alignment.offsetX -= amount;
    if (direction === "right") alignment.offsetX += amount;
    if (direction === "up") alignment.offsetY -= amount;
    if (direction === "down") alignment.offsetY += amount;
    alignment.offsetX = clamp(alignment.offsetX, -16384, 16384); alignment.offsetY = clamp(alignment.offsetY, -16384, 16384);
    alignmentDirty = true; syncAlignmentInputs(); updateFramePreview(); changed();
  });
  listen(field("frame-alignment-overlay"), "pointerdown", event => {
    if (!image?.width || !image?.height) return;
    event.preventDefault();
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offsetX: alignment.offsetX, offsetY: alignment.offsetY };
    field("frame-alignment-overlay").setPointerCapture?.(event.pointerId);
  });
  listen(field("frame-alignment-overlay"), "pointermove", event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const rectangle = field("sheet-grid-image").getBoundingClientRect();
    if (!rectangle.width || !rectangle.height) return;
    alignment.offsetX = clamp(Math.round(drag.offsetX + (event.clientX - drag.x) * image.width / rectangle.width), -16384, 16384);
    alignment.offsetY = clamp(Math.round(drag.offsetY + (event.clientY - drag.y) * image.height / rectangle.height), -16384, 16384);
    alignmentDirty = true; syncAlignmentInputs(); updateFramePreview();
  });
  listen(field("frame-alignment-overlay"), "pointerup", event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag = null; changed();
  });
  listen(field("trim-empty"), "click", () => {
    const frames = playbackFrames(), trimmed = trimEmptyFrameSelection(frames, analysis.emptyFrames);
    if (!trimmed.length) { status("Every enabled frame appears blank; nothing was trimmed."); return; }
    if (trimmed.length === frames.length) { status("No blank start or end frames were found in the enabled range."); return; }
    selectedFrame = trimmed[0]; writeFrames(trimmed); status(`Trimmed ${frames.length - trimmed.length} blank start/end frame${frames.length - trimmed.length === 1 ? "" : "s"}. The uploaded artwork was not changed.`);
  });

  syncAlignmentInputs();
  return { sync, write, resetGrid, getMetadata: metadata, getAnalysis: () => analysis, getSelectedFrame: () => selectedFrame };
}
