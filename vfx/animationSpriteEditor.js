import { analyzeAnimationSprite, getSpriteGridSuggestions, trimEmptyFrameSelection } from "./animationSpriteCheck.js";

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

  function frameDiagnostics(index) {
    return analysis.frames[index] || null;
  }

  function updateFramePreview() {
    const { columns, rows, total } = gridState();
    selectedFrame = clamp(selectedFrame, 0, Math.max(0, total - 1));
    const column = selectedFrame % columns, row = Math.floor(selectedFrame / columns);
    field("frame-scrubber").max = String(Math.max(0, total - 1)); field("frame-scrubber").value = String(selectedFrame);
    field("frame-position").textContent = `FRAME ${selectedFrame + 1} / ${total}`;
    const art = field("frame-crop-art");
    art.style.backgroundImage = source ? `url(${JSON.stringify(source)})` : "";
    art.style.backgroundSize = `${columns * 100}% ${rows * 100}%`;
    art.style.backgroundPosition = `${columns === 1 ? 0 : column / (columns - 1) * 100}% ${rows === 1 ? 0 : row / (rows - 1) * 100}%`;
    if (image?.width && image?.height) art.style.aspectRatio = `${image.width / columns} / ${image.height / rows}`;
    const diagnostic = frameDiagnostics(selectedFrame), bounds = diagnostic?.bounds;
    const outline = field("frame-content-bounds"), showCrop = field("frame-crop-toggle").checked;
    outline.hidden = !showCrop || !bounds;
    if (bounds) {
      outline.style.left = `${bounds.left * 100}%`; outline.style.top = `${bounds.top * 100}%`;
      outline.style.width = `${(bounds.right - bounds.left) * 100}%`; outline.style.height = `${(bounds.bottom - bounds.top) * 100}%`;
    }
    field("frame-padding").hidden = !showCrop;
    field("frame-padding").textContent = !analysis.available ? "Transparency unavailable; full cell shown."
      : diagnostic?.empty ? "Blank frame."
      : `Visible ${(diagnostic.coverage * 100).toFixed(1)}% · padding L ${Math.round(bounds.left * 100)}% / R ${Math.round((1 - bounds.right) * 100)}% / T ${Math.round(bounds.top * 100)}% / B ${Math.round((1 - bounds.bottom) * 100)}%`;
    for (const button of field("frame-grid").querySelectorAll("[data-frame-preview]")) button.dataset.previewing = String(Number(button.dataset.framePreview) === selectedFrame);
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
    // Keep the form-wide input synchronizer from restoring the old sequence
    // before this checkbox has written its new playback selection.
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
    selectedFrame = 0; gridSignature = ""; changed(); status(`${size}×${size} grid applied. The uploaded artwork was not changed.`);
  });
  listen(field("frame-first"), "click", () => { selectedFrame = 0; updateFramePreview(); });
  listen(field("frame-previous"), "click", () => { selectedFrame--; updateFramePreview(); });
  listen(field("frame-next"), "click", () => { selectedFrame++; updateFramePreview(); });
  listen(field("frame-last"), "click", () => { selectedFrame = gridState().total - 1; updateFramePreview(); });
  listen(field("frame-scrubber"), "input", () => { selectedFrame = Number(field("frame-scrubber").value); updateFramePreview(); });
  listen(field("frame-crop-toggle"), "change", updateFramePreview);
  listen(field("trim-empty"), "click", () => {
    const frames = playbackFrames(), trimmed = trimEmptyFrameSelection(frames, analysis.emptyFrames);
    if (!trimmed.length) { status("Every enabled frame appears blank; nothing was trimmed."); return; }
    if (trimmed.length === frames.length) { status("No blank start or end frames were found in the enabled range."); return; }
    selectedFrame = trimmed[0]; writeFrames(trimmed); status(`Trimmed ${frames.length - trimmed.length} blank start/end frame${frames.length - trimmed.length === 1 ? "" : "s"}. The uploaded artwork was not changed.`);
  });

  return { sync, getAnalysis: () => analysis, getSelectedFrame: () => selectedFrame };
}
