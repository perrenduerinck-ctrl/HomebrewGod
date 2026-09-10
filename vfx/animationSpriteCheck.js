import { resolveVfxAlphaSource } from "./alphaAssets.js";

export async function inspectAnimationSprite(src) {
  const image = new Image();
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error("Unable to load this image. Choose a valid PNG, WebP or JPEG.")); image.src = resolveVfxAlphaSource(src); });
  const result = { width: image.naturalWidth, height: image.naturalHeight, transparency: null };
  if (result.width > 16384 || result.height > 16384 || result.width * result.height > 64 * 1024 * 1024) throw new Error("The image dimensions are too large (maximum 16384 pixels per side and 64 megapixels).");
  const canvas = document.createElement("canvas"), factor = Math.min(1, 256 / Math.max(result.width, result.height));
  canvas.width = Math.max(1, Math.round(result.width * factor)); canvas.height = Math.max(1, Math.round(result.height * factor));
  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data; result.transparency = false;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 255) { result.transparency = true; break; }
  } catch { /* Cross-origin images can render even when alpha inspection is unavailable. */ }
  canvas.width = canvas.height = 1;
  return result;
}
export function spriteCheckSummary(image, columns, rows, count, end) {
  if (!image) return "Upload a sheet to inspect its cells and transparency.";
  const warnings = [];
  if (image.width % columns || image.height % rows) warnings.push("Image dimensions do not divide evenly by the grid; cells use fractional pixels.");
  if (count > columns * rows || end >= columns * rows) warnings.push("Frames exceed the available cells.");
  if (image.transparency === false) warnings.push("No transparency detected in the preview sample. An opaque background will remain visible.");
  if (image.transparency === null) warnings.push("Transparency could not be inspected for this image.");
  if (image.width * image.height > 12000000) warnings.push("Large image: a smaller sheet may load faster.");
  return `Image ${image.width} × ${image.height} · Grid ${columns} × ${rows} · Frame ${(image.width / columns).toFixed(1)} × ${(image.height / rows).toFixed(1)} · Frames ${count} / ${columns * rows}${warnings.length ? "\n" + warnings.join("\n") : "\nTransparency detected · Grid divides cleanly"}`;
}
