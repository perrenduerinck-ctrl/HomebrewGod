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
    frameCount: clamp(
      Math.round(
        finiteNumber(options.frameCount) ?? 1
      ),
      1,
      MAX_SPRITE_FRAMES
    ),
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
    )
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
  return Object.freeze({
    width: `${normalized.frameWidth}px`,
    height: `${normalized.frameHeight}px`,
    backgroundPosition:
      `${-frame * normalized.frameWidth}px 0px`
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
    normalized.frameCount * normalized.loops;
  const frameDuration =
    1000 / normalized.framesPerSecond;
  let frameHandle = null;
  let startedAt = null;
  let running = false;

  element.style.backgroundImage = normalized.src
    ? `url(${JSON.stringify(normalized.src)})`
    : "none";
  element.style.backgroundRepeat = "no-repeat";

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
      onComplete();
      return;
    }

    applyFrame(
      absoluteFrame % normalized.frameCount
    );
    frameHandle = schedule(tick);
  }

  function start() {
    if (running) return false;
    running = true;
    startedAt = null;
    applyFrame(0);
    frameHandle = schedule(tick);
    return true;
  }

  function destroy() {
    stop();
    element.style.backgroundImage = "none";
  }

  return Object.freeze({
    destroy,
    getState: () => Object.freeze({
      running,
      options: normalized
    }),
    start,
    stop
  });
}
