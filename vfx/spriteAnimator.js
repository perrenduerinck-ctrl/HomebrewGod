export const MAX_SPRITE_FRAMES = 240;

const finiteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : null;
};

const clamp = (value, minimum, maximum) => (
  Math.min(maximum, Math.max(minimum, value))
);

export function normalizeSpriteOptions(
  options = {}
) {
  const frameCount = clamp(
    Math.round(
      finiteNumber(options.frameCount) ?? 1
    ),
    1,
    MAX_SPRITE_FRAMES
  );
  const requestedColumns = finiteNumber(
    options.columns
  );
  const requestedRows = finiteNumber(
    options.rows
  );
  let columns = frameCount;
  let rows = 1;

  if (requestedColumns !== null) {
    columns = clamp(
      Math.round(requestedColumns),
      1,
      frameCount
    );
    rows = clamp(
      Math.round(
        requestedRows ??
        Math.ceil(frameCount / columns)
      ),
      Math.ceil(frameCount / columns),
      frameCount
    );
  } else if (requestedRows !== null) {
    rows = clamp(
      Math.round(requestedRows),
      1,
      frameCount
    );
    columns = Math.ceil(frameCount / rows);
  }
  const loop = options.loop === true;
  const startFrame = clamp(Math.round(finiteNumber(options.startFrame) ?? 0), 0, frameCount - 1);
  const endFrame = clamp(Math.round(finiteNumber(options.endFrame) ?? frameCount - 1),
    startFrame, frameCount - 1);
  const removeOnComplete = !loop && (
    options.removeOnComplete === true ||
    (
      options.removeOnComplete !== false &&
      frameCount > 1
    )
  );
  const requestedFrameDuration = finiteNumber(
    options.frameDuration ?? options.frameDurationMs
  );
  const framesPerSecond = clamp(
    finiteNumber(options.framesPerSecond) ??
      (requestedFrameDuration > 0 ? 1000 / requestedFrameDuration : 24),
    1,
    60
  );

  const validBounds = (values, count, extent) => Array.isArray(values) &&
    values.length === count + 1 && values.every((v, i) => Number.isFinite(v) &&
      v >= 0 && v <= extent && (!i || v - values[i - 1] >= 4));
  const sourceAtlas = options.atlas;
  const atlas = sourceAtlas && Number.isFinite(sourceAtlas.width) &&
    Number.isFinite(sourceAtlas.height) && sourceAtlas.width <= 16384 &&
    sourceAtlas.height <= 16384 &&
    validBounds(sourceAtlas.columns, columns, sourceAtlas.width) &&
    validBounds(sourceAtlas.rows, rows, sourceAtlas.height)
    ? Object.freeze({ width: sourceAtlas.width, height: sourceAtlas.height,
      columns: Object.freeze([...sourceAtlas.columns]), rows: Object.freeze([...sourceAtlas.rows]),
      inset: clamp(Math.round(finiteNumber(sourceAtlas.inset) ?? 1), 0, 64) })
    : null;

  return Object.freeze({
    ...(atlas ? { atlas } : {}),
    src: String(options.src || "").trim(),
    frameWidth: clamp(
      Math.round(
        finiteNumber(options.frameWidth) ?? 64
      ),
      1,
      4096
    ),
    frameHeight: clamp(
      Math.round(
        finiteNumber(options.frameHeight) ?? 64
      ),
      1,
      4096
    ),
    frameCount,
    startFrame,
    endFrame,
    columns,
    rows,
    framesPerSecond,
    loops: clamp(
      Math.round(
        finiteNumber(options.loops) ?? 1
      ),
      1,
      100
    ),
    loop,
    removeOnComplete
  });
}

export function getSpriteFrameStyle(
  options,
  frameIndex
) {
  const normalized = normalizeSpriteOptions(
    options
  );
  const frame = clamp(
    Math.floor(finiteNumber(frameIndex) ?? 0),
    0,
    normalized.frameCount - 1
  );
  const column = frame % normalized.columns;
  const row = Math.floor(
    frame / normalized.columns
  );
  if (normalized.atlas) {
    const atlas = normalized.atlas;
    // Inset into each measured gutter, preserving the complete source image
    // on disk. Status sheets use a larger inset to exclude their drawn grid.
    const inset = Math.min(atlas.inset,
      Math.floor((atlas.columns[column + 1] - atlas.columns[column] - 1) / 2),
      Math.floor((atlas.rows[row + 1] - atlas.rows[row] - 1) / 2));
    const x = atlas.columns[column] + inset, y = atlas.rows[row] + inset;
    const width = atlas.columns[column + 1] - x - inset;
    const height = atlas.rows[row + 1] - y - inset;
    const scale = Math.min(normalized.frameWidth / width, normalized.frameHeight / height);
    const px = n => `${Math.round(n * 10000) / 10000}px`;
    return Object.freeze({
      width: px(width * scale), height: px(height * scale),
      backgroundSize: `${px(atlas.width * scale)} ${px(atlas.height * scale)}`,
      backgroundPosition: `${px(-x * scale)} ${px(-y * scale)}`
    });
  }
  return Object.freeze({
    width: `${normalized.frameWidth}px`,
    height: `${normalized.frameHeight}px`,
    backgroundPosition:
      `${-column * normalized.frameWidth}px ` +
      `${-row * normalized.frameHeight}px`
  });
}

export function createSpriteAnimator({
  element,
  options = {},
  manual = false,
  requestFrame = globalThis.requestAnimationFrame,
  cancelFrame = globalThis.cancelAnimationFrame,
  now = () => globalThis.performance?.now?.() ?? Date.now(),
  onComplete = () => {}
} = {}) {
  if (!element?.style) {
    throw new TypeError(
      "Sprite animation requires a styled element."
    );
  }

  const normalized = normalizeSpriteOptions(
    options
  );
  const fallbackRequest = (callback) => (
    setTimeout(() => callback(now()), 16)
  );
  const fallbackCancel = (handle) => (
    clearTimeout(handle)
  );
  const schedule = typeof requestFrame === "function"
    ? requestFrame
    : fallbackRequest;
  const cancel = typeof cancelFrame === "function"
    ? cancelFrame
    : fallbackCancel;
  const totalFrames =
    normalized.loop
      ? Infinity
      : (normalized.endFrame - normalized.startFrame + 1) * normalized.loops;
  const playbackFrames = normalized.endFrame - normalized.startFrame + 1;
  const frameDuration = 1000 / normalized.framesPerSecond;
  let frameHandle = null;
  let startedAt = null;
  let running = false;
  let completed = false;
  let destroyed = false;
  let lastAppliedFrame = -1;

  element.style.backgroundImage = normalized.src
    ? `url(${JSON.stringify(normalized.src)})`
    : "none";
  element.style.backgroundRepeat = "no-repeat";
  element.style.backgroundSize =
    `${normalized.frameWidth * normalized.columns}px ` +
    `${normalized.frameHeight * normalized.rows}px`;

  function clearSprite() {
    try {
      element.style.backgroundImage = "none";
      element.style.backgroundSize = "auto";
    } catch {
      // A failed visual adapter must not affect spell resolution.
    }
  }

  function applyFrame(frameIndex) {
    // A 24-fps sheet should not rewrite styles at the display's 60/120 Hz.
    if (frameIndex === lastAppliedFrame) return;
    lastAppliedFrame = frameIndex;
    const style = getSpriteFrameStyle(
      normalized,
      frameIndex
    );
    Object.assign(element.style, style);
  }

  function stop() {
    if (frameHandle !== null) {
      cancel(frameHandle);
    }
    frameHandle = null;
    running = false;
  }

  function tick(timestamp, scheduleNext = true) {
    if (!running) return;
    if (startedAt === null) {
      startedAt = timestamp;
    }
    const elapsed = Math.max(
      0,
      timestamp - startedAt
    );
    const absoluteFrame = Math.floor(
      elapsed / frameDuration
    );

    if (absoluteFrame >= totalFrames) {
      applyFrame(normalized.endFrame);
      stop();
      completed = true;
      if (normalized.removeOnComplete) {
        clearSprite();
        try {
          element.remove?.();
        } catch {
          // The engine still owns the outer effect cleanup timer.
        }
      }
      try {
        onComplete();
      } catch {
        // Presentation observers cannot break animation cleanup.
      }
      return;
    }

    applyFrame(
      normalized.startFrame + absoluteFrame % playbackFrames
    );
    if (scheduleNext && !manual) {
      frameHandle = schedule(tick);
    }
  }

  function start() {
    if (
      running ||
      destroyed ||
      (
        completed &&
        normalized.removeOnComplete
      )
    ) return false;
    running = true;
    completed = false;
    startedAt = null;
    applyFrame(normalized.startFrame);
    if (!manual) {
      frameHandle = schedule(tick);
    }
    return true;
  }

  function seek(timestamp) {
    if (!manual || !running || destroyed) return false;
    tick(finiteNumber(timestamp) ?? now(), false);
    return true;
  }

  function destroy() {
    stop();
    destroyed = true;
    clearSprite();
  }

  return Object.freeze({
    destroy,
    getState: () => Object.freeze({
      completed,
      currentFrame: lastAppliedFrame < 0
        ? normalized.startFrame
        : lastAppliedFrame,
      destroyed,
      running,
      options: normalized
    }),
    seek,
    start,
    stop
  });
}
