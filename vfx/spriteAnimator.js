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
  const removeOnComplete = !loop && (
    options.removeOnComplete === true ||
    (
      options.removeOnComplete !== false &&
      frameCount > 1
    )
  );

  return Object.freeze({
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
    columns,
    rows,
    framesPerSecond: clamp(
      finiteNumber(options.framesPerSecond) ?? 24,
      1,
      60
    ),
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
      : normalized.frameCount * normalized.loops;
  const frameDuration =
    1000 / normalized.framesPerSecond;
  let frameHandle = null;
  let startedAt = null;
  let running = false;
  let completed = false;
  let destroyed = false;

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

  function tick(timestamp) {
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
      applyFrame(normalized.frameCount - 1);
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
      absoluteFrame % normalized.frameCount
    );
    frameHandle = schedule(tick);
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
    applyFrame(0);
    frameHandle = schedule(tick);
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
      destroyed,
      running,
      options: normalized
    }),
    start,
    stop
  });
}
