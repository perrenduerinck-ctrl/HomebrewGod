const finite = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

/** Build the ordinary equal-cell grid used when a sheet has no measured atlas. */
export function createUniformSpriteAtlas(width, height, columns, rows, alignment = {}) {
  return {
    width,
    height,
    columns: Array.from({ length: columns + 1 }, (_, index) => index * width / columns),
    rows: Array.from({ length: rows + 1 }, (_, index) => index * height / rows),
    ...alignment
  };
}

export function getSpriteAtlasAlignment(atlas, fallbackInset = 0) {
  const inset = Math.max(0, finite(atlas?.inset, fallbackInset));
  return Object.freeze({
    offsetX: finite(atlas?.offsetX, 0),
    offsetY: finite(atlas?.offsetY, 0),
    insetX: Math.max(0, finite(atlas?.insetX, inset)),
    insetY: Math.max(0, finite(atlas?.insetY, inset))
  });
}

export function resetSpriteAtlasAlignment(atlas, fallbackInset = 0) {
  const inset = Math.max(0, finite(atlas?.inset, fallbackInset));
  return {
    ...atlas,
    inset,
    offsetX: 0,
    offsetY: 0,
    insetX: inset,
    insetY: inset
  };
}

/**
 * Resolve one source rectangle from atlas metadata. Offsets move the grid over
 * the original image and are clipped at its outer edge; insets then trim each
 * sampled cell. No image pixels are rewritten.
 */
export function getSpriteAtlasFrameBounds(atlas, column, row, { fallbackInset = 0 } = {}) {
  if (!atlas || !Array.isArray(atlas.columns) || !Array.isArray(atlas.rows)) return null;
  const maxColumn = atlas.columns.length - 2, maxRow = atlas.rows.length - 2;
  column = clamp(Math.floor(finite(column)), 0, maxColumn);
  row = clamp(Math.floor(finite(row)), 0, maxRow);
  const width = Math.max(1, finite(atlas.width, atlas.columns.at(-1)));
  const height = Math.max(1, finite(atlas.height, atlas.rows.at(-1)));
  const alignment = getSpriteAtlasAlignment(atlas, fallbackInset);
  const intended = Object.freeze({
    left: atlas.columns[column],
    top: atlas.rows[row],
    right: atlas.columns[column + 1],
    bottom: atlas.rows[row + 1]
  });
  const shifted = Object.freeze({
    left: intended.left + alignment.offsetX,
    top: intended.top + alignment.offsetY,
    right: intended.right + alignment.offsetX,
    bottom: intended.bottom + alignment.offsetY
  });
  const clipped = {
    left: clamp(shifted.left, 0, width),
    top: clamp(shifted.top, 0, height),
    right: clamp(shifted.right, 0, width),
    bottom: clamp(shifted.bottom, 0, height)
  };
  // Match the legacy integer inset clamp exactly when no alignment metadata is
  // present, while still supporting independently edited axes.
  const insetX = Math.min(alignment.insetX, Math.max(0, Math.floor((clipped.right - clipped.left - 1) / 2)));
  const insetY = Math.min(alignment.insetY, Math.max(0, Math.floor((clipped.bottom - clipped.top - 1) / 2)));
  const sample = Object.freeze({
    left: clipped.left + insetX,
    top: clipped.top + insetY,
    right: clipped.right - insetX,
    bottom: clipped.bottom - insetY
  });
  return Object.freeze({
    x: sample.left,
    y: sample.top,
    width: Math.max(1, sample.right - sample.left),
    height: Math.max(1, sample.bottom - sample.top),
    intended,
    shifted,
    sample,
    alignment,
    bleed: Object.freeze({
      left: Math.max(0, intended.left - sample.left),
      right: Math.max(0, sample.right - intended.right),
      top: Math.max(0, intended.top - sample.top),
      bottom: Math.max(0, sample.bottom - intended.bottom)
    })
  });
}

export function getSpriteAtlasMaximumFrameSize(atlas, { fallbackInset = 0 } = {}) {
  let width = 0, height = 0;
  for (let row = 0; row < atlas.rows.length - 1; row++) {
    for (let column = 0; column < atlas.columns.length - 1; column++) {
      const frame = getSpriteAtlasFrameBounds(atlas, column, row, { fallbackInset });
      width = Math.max(width, frame.width);
      height = Math.max(height, frame.height);
    }
  }
  return Object.freeze({ width, height });
}
