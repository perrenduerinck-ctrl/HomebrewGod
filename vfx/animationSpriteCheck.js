import { resolveVfxAlphaSource } from "./alphaAssets.js";

const GRID_SIZES = Object.freeze([4, 5, 6, 7, 8]);
const MAX_ANALYZED_CELLS = 4096;
const positiveInteger = value => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : 1;

export async function inspectAnimationSprite(src) {
  const image = new Image();
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error("Unable to load this image. Choose a valid PNG, WebP or JPEG.")); image.src = resolveVfxAlphaSource(src); });
  const result = { width: image.naturalWidth, height: image.naturalHeight, transparency: null, sample: null };
  if (result.width > 16384 || result.height > 16384 || result.width * result.height > 64 * 1024 * 1024) throw new Error("The image dimensions are too large (maximum 16384 pixels per side and 64 megapixels).");
  // A bounded alpha sample is enough for diagnostics while avoiding another
  // full-size copy of a potentially large uploaded sprite sheet.
  const canvas = document.createElement("canvas"), factor = Math.min(1, 1024 / Math.max(result.width, result.height));
  canvas.width = Math.max(1, Math.round(result.width * factor)); canvas.height = Math.max(1, Math.round(result.height * factor));
  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const alpha = new Uint8ClampedArray(canvas.width * canvas.height); result.transparency = false;
    for (let source = 3, target = 0; source < data.length; source += 4, target++) {
      alpha[target] = data[source];
      if (data[source] < 255) result.transparency = true;
    }
    result.sample = { width: canvas.width, height: canvas.height, alpha };
  } catch { /* Cross-origin images can render even when alpha inspection is unavailable. */ }
  canvas.width = canvas.height = 1;
  return result;
}

export function getSpriteGridSuggestions(image) {
  if (!image?.width || !image?.height) return [];
  return GRID_SIZES.map(size => {
    const cellWidth = image.width / size, cellHeight = image.height / size;
    return Object.freeze({ columns: size, rows: size, cellWidth, cellHeight,
      exact: Number.isInteger(cellWidth) && Number.isInteger(cellHeight) });
  }).sort((a, b) => Number(b.exact) - Number(a.exact) || a.columns - b.columns);
}

export function analyzeAnimationSprite(image, columns, rows) {
  columns = positiveInteger(columns); rows = positiveInteger(rows);
  const sample = image?.sample;
  const total = columns * rows;
  if (!sample?.alpha || !sample.width || !sample.height || total > MAX_ANALYZED_CELLS) return Object.freeze({ available: false, limited: total > MAX_ANALYZED_CELLS, frames: Object.freeze([]), emptyFrames: Object.freeze([]), mostlyTransparentFrames: Object.freeze([]) });
  const frames = [];
  for (let index = 0; index < total; index++) {
    const column = index % columns, row = Math.floor(index / columns);
    const left = Math.floor(column * sample.width / columns), right = Math.max(left + 1, Math.floor((column + 1) * sample.width / columns));
    const top = Math.floor(row * sample.height / rows), bottom = Math.max(top + 1, Math.floor((row + 1) * sample.height / rows));
    let visible = 0, minX = right, minY = bottom, maxX = left - 1, maxY = top - 1;
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) if (sample.alpha[y * sample.width + x] > 8) {
      visible++; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    const pixels = Math.max(1, (right - left) * (bottom - top));
    const empty = visible === 0, coverage = visible / pixels;
    const bounds = empty ? null : Object.freeze({
      left: (minX - left) / (right - left), top: (minY - top) / (bottom - top),
      right: (maxX + 1 - left) / (right - left), bottom: (maxY + 1 - top) / (bottom - top)
    });
    frames.push(Object.freeze({ index, empty, mostlyTransparent: !empty && coverage < .08, coverage, bounds }));
  }
  return Object.freeze({ available: true, limited: false, frames: Object.freeze(frames),
    emptyFrames: Object.freeze(frames.filter(frame => frame.empty).map(frame => frame.index)),
    mostlyTransparentFrames: Object.freeze(frames.filter(frame => frame.mostlyTransparent).map(frame => frame.index)) });
}

export function trimEmptyFrameSelection(frames, emptyFrames) {
  const empty = new Set(emptyFrames || []), result = [...new Set((frames || []).map(Number).filter(Number.isInteger))];
  while (result.length && empty.has(result[0])) result.shift();
  while (result.length && empty.has(result[result.length - 1])) result.pop();
  return result;
}

export function spriteCheckSummary(image, columns, rows, count, end, analysis = null) {
  if (!image) return "Upload a sheet to inspect its cells and transparency.";
  const warnings = [];
  if (image.width % columns || image.height % rows) warnings.push("Image dimensions do not divide evenly by the grid; cells use fractional pixels.");
  else if (image.width / columns !== image.height / rows) warnings.push("Cells are non-square; confirm that this is intentional.");
  if (count > columns * rows || end >= columns * rows) warnings.push("Frames exceed the available cells.");
  if (image.transparency === false) warnings.push("No transparency detected in the preview sample. An opaque background will remain visible.");
  if (image.transparency === null) warnings.push("Transparency could not be inspected for this image.");
  if (analysis?.limited) warnings.push(`Per-frame inspection is limited to ${MAX_ANALYZED_CELLS} cells; playback metadata remains available.`);
  if (analysis?.available && analysis.emptyFrames.length) warnings.push(`${analysis.emptyFrames.length} blank frame${analysis.emptyFrames.length === 1 ? "" : "s"} detected.`);
  if (analysis?.available && analysis.mostlyTransparentFrames.length) warnings.push(`${analysis.mostlyTransparentFrames.length} mostly transparent frame${analysis.mostlyTransparentFrames.length === 1 ? "" : "s"} detected.`);
  if (image.width * image.height > 12000000) warnings.push("Large image: a smaller sheet may load faster.");
  return `Image ${image.width} × ${image.height} · Grid ${columns} × ${rows} · Frame ${(image.width / columns).toFixed(1)} × ${(image.height / rows).toFixed(1)} · Frames ${count} / ${columns * rows}${warnings.length ? "\n" + warnings.join("\n") : "\nTransparency detected · Grid divides cleanly"}`;
}
