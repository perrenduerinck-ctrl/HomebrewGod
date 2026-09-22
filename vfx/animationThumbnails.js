export const ANIMATION_THUMBNAIL_SIZE = 128;

const text = value => String(value ?? "").trim();

export function getAnimationThumbnailUrl(animation) {
  return text(animation?.thumbnailUrl);
}

function representativeFrame(animation) {
  const sequence = animation?.frames?.sequence;
  if (Array.isArray(sequence) && sequence.length) {
    return Number(sequence[Math.floor(sequence.length / 2)]) || 0;
  }
  const start = Number(animation?.frames?.start) || 0;
  const end = Number(animation?.frames?.end);
  return Math.round((start + (Number.isFinite(end) ? end : start)) / 2);
}

function frameBounds(animation, image) {
  const columns = Math.max(1, Number(animation?.grid?.columns) || 1);
  const rows = Math.max(1, Number(animation?.grid?.rows) || 1);
  const frame = Math.max(0, Math.min(columns * rows - 1, representativeFrame(animation)));
  const column = frame % columns;
  const row = Math.floor(frame / columns);
  const atlas = animation?.atlas;
  const atlasMatches = atlas && Array.isArray(atlas.columns) && Array.isArray(atlas.rows) &&
    atlas.columns.length === columns + 1 && atlas.rows.length === rows + 1;
  const left = atlasMatches ? atlas.columns[column] : image.width * column / columns;
  const right = atlasMatches ? atlas.columns[column + 1] : image.width * (column + 1) / columns;
  const top = atlasMatches ? atlas.rows[row] : image.height * row / rows;
  const bottom = atlasMatches ? atlas.rows[row + 1] : image.height * (row + 1) / rows;
  const inset = Math.max(0, Number(animation?.inset ?? atlas?.inset) || 0);
  return {
    x: Math.min(right - 1, left + inset),
    y: Math.min(bottom - 1, top + inset),
    width: Math.max(1, right - left - inset * 2),
    height: Math.max(1, bottom - top - inset * 2)
  };
}

async function decodeImage(file) {
  if (typeof globalThis.createImageBitmap === "function") {
    return globalThis.createImageBitmap(file);
  }
  if (!globalThis.Image || !globalThis.URL?.createObjectURL) {
    throw new Error("This browser cannot create an animation thumbnail.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("The sprite sheet could not be decoded for its thumbnail."));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error("The animation thumbnail could not be encoded.")),
    type,
    quality
  ));
}

function blobDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("The animation thumbnail could not be read."));
    reader.readAsDataURL(blob);
  });
}

/** Creates one representative frame without loading the sheet again later in
 * library views. Persistent stores upload `file`; signed-out sessions use the
 * small `dataUrl` until the animation is promoted to an account. */
export async function createAnimationThumbnail(spriteFile, animation, { size = ANIMATION_THUMBNAIL_SIZE } = {}) {
  if (!spriteFile) throw new Error("Choose a sprite sheet before creating its thumbnail.");
  if (!globalThis.document?.createElement) throw new Error("Animation thumbnails require a browser image canvas.");
  const image = await decodeImage(spriteFile);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.max(96, Math.min(160, Math.round(size)));
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("The browser could not prepare the animation thumbnail canvas.");
    const source = frameBounds(animation, image);
    const padding = 4;
    const scale = Math.min((canvas.width - padding * 2) / source.width, (canvas.height - padding * 2) / source.height);
    const width = source.width * scale;
    const height = source.height * scale;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, source.x, source.y, source.width, source.height,
      (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    let mimeType = "image/webp";
    let blob = await canvasBlob(canvas, mimeType, .82);
    if (blob.type !== mimeType) {
      mimeType = "image/png";
      blob = await canvasBlob(canvas, mimeType);
    }
    const extension = mimeType === "image/webp" ? "webp" : "png";
    const base = text(animation?.id || spriteFile.name || "animation").replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").slice(0, 80) || "animation";
    const file = new File([blob], `${base}-thumbnail.${extension}`, { type: mimeType, lastModified: Date.now() });
    return { file, dataUrl: await blobDataUrl(blob), width: canvas.width, height: canvas.height, mimeType };
  } finally {
    image.close?.();
  }
}

/** Thumbnail images have their own bounded cache. Full sprite sheets remain in
 * the player cache and are never requested by this cache. */
export function createAnimationThumbnailCache({ maximumEntries = 256, ImageClass = globalThis.Image } = {}) {
  const entries = new Map();
  let destroyed = false;

  function trim() {
    while (entries.size > maximumEntries) {
      const [oldest, entry] = entries.entries().next().value;
      entry.finish(false);
      entries.delete(oldest);
    }
  }

  function preload(source) {
    const url = text(source);
    if (!url || destroyed || typeof ImageClass !== "function") return Promise.resolve(false);
    if (entries.has(url)) {
      const entry = entries.get(url);
      entries.delete(url);
      entries.set(url, entry);
      return entry.promise;
    }
    const image = new ImageClass();
    image.decoding = "async";
    const entry = { image, promise: null, finish: null };
    entry.promise = new Promise(resolve => {
      let settled = false;
      entry.finish = value => {
        if (settled) return;
        settled = true;
        image.onload = image.onerror = null;
        resolve(value);
      };
      image.onload = () => entry.finish(true);
      image.onerror = () => entry.finish(false);
    });
    entries.set(url, entry);
    trim();
    image.src = url;
    return entry.promise;
  }

  return Object.freeze({
    preload,
    has: source => entries.has(text(source)),
    get size() { return entries.size; },
    clear() {
      destroyed = true;
      for (const entry of entries.values()) entry.finish(false);
      entries.clear();
    }
  });
}
