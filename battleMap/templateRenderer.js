import {
  createTemplateGeometry,
  formatTemplateLabel,
  getDefaultTemplateOptions,
  normalizeTemplateAngle,
  normalizeTemplateDistance,
  normalizeTemplateShape
} from "./templateGeometry.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const clamp = (value, minimum, maximum) => (
  Math.min(maximum, Math.max(minimum, value))
);

function createElement(documentRef, className) {
  const element = documentRef.createElement("div");
  element.className = className;
  return element;
}

function createSvgElement(documentRef, name, className) {
  const element = documentRef.createElementNS(
    SVG_NAMESPACE,
    name
  );
  if (className) {
    element.setAttribute("class", className);
  }
  return element;
}

function isDirectionalShape(shape) {
  return shape === "cone" || shape === "line";
}

function copyPoint(point) {
  return point
    ? {
        x: point.x,
        y: point.y,
        xRatio: point.xRatio,
        yRatio: point.yRatio
      }
    : null;
}

export function createMapTemplateEngine({
  surface,
  getTargetElement = () => surface,
  getPixelsPerSquare = () => 64,
  getFeetPerSquare = () => 5,
  onStateChange = () => {}
} = {}) {
  if (
    !surface ||
    typeof surface.appendChild !== "function"
  ) {
    throw new TypeError(
      "Map templates require a map surface element."
    );
  }

  const documentRef = surface.ownerDocument;
  const windowRef = documentRef.defaultView;
  const overlay = createElement(
    documentRef,
    "hg-map-template-layer"
  );
  const svg = createSvgElement(
    documentRef,
    "svg",
    "hg-map-template-svg"
  );
  const path = createSvgElement(
    documentRef,
    "path",
    "hg-map-template-shape"
  );
  const originDot = createElement(
    documentRef,
    "hg-map-template-origin"
  );
  const label = createElement(
    documentRef,
    "hg-map-template-label"
  );
  let enabled = false;
  let connected = false;
  let shape = "circle";
  let options = {
    ...getDefaultTemplateOptions(shape)
  };
  let cursor = null;
  let anchor = null;
  let anchorLocked = false;
  let confirmed = false;

  overlay.hidden = true;
  overlay.setAttribute(
    "aria-label",
    "Battle map area template"
  );
  svg.setAttribute("aria-hidden", "true");
  svg.appendChild(path);
  overlay.append(svg, originDot, label);

  function projectPoint(point) {
    if (!point) return;
    const width = Math.max(1, overlay.clientWidth);
    const height = Math.max(1, overlay.clientHeight);
    point.x = point.xRatio * width;
    point.y = point.yRatio * height;
  }

  function syncBounds() {
    const target = getTargetElement() || surface;
    const surfaceRect = surface.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const width = Math.max(
      1,
      targetRect.width || surfaceRect.width
    );
    const height = Math.max(
      1,
      targetRect.height || surfaceRect.height
    );

    overlay.style.left = `${
      targetRect.left - surfaceRect.left + surface.scrollLeft
    }px`;
    overlay.style.top = `${
      targetRect.top - surfaceRect.top + surface.scrollTop
    }px`;
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    projectPoint(cursor);
    projectPoint(anchor);
  }

  function pointFromEvent(event) {
    const rect = overlay.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const x = clamp(
      event.clientX - rect.left,
      0,
      width
    );
    const y = clamp(
      event.clientY - rect.top,
      0,
      height
    );

    return {
      x,
      y,
      xRatio: x / width,
      yRatio: y / height
    };
  }

  function getPhase() {
    if (!enabled) return "inactive";
    if (confirmed) return "confirmed";
    if (isDirectionalShape(shape) && anchor) {
      return "aiming";
    }
    return "preview";
  }

  function getGeometry() {
    if (!enabled || !cursor) return null;

    const geometryAnchor = isDirectionalShape(shape)
      ? anchor || cursor
      : cursor;
    const geometryPointer = isDirectionalShape(shape) && !anchor
      ? {
          x: cursor.x + 1,
          y: cursor.y
        }
      : cursor;

    return createTemplateGeometry({
      shape,
      anchor: geometryAnchor,
      pointer: geometryPointer,
      sizeFeet: options.sizeFeet,
      widthFeet: options.widthFeet,
      angleDegrees: options.angleDegrees,
      pixelsPerSquare: getPixelsPerSquare(),
      feetPerSquare: getFeetPerSquare()
    });
  }

  function getState() {
    const geometry = getGeometry();
    return Object.freeze({
      enabled,
      shape,
      phase: getPhase(),
      confirmed,
      anchorLocked,
      anchor: copyPoint(anchor),
      cursor: copyPoint(cursor),
      options: Object.freeze({ ...options }),
      geometry,
      label: formatTemplateLabel(geometry)
    });
  }

  function emitState() {
    onStateChange(getState());
  }

  function positionElement(element, point) {
    element.style.left = `${point.x}px`;
    element.style.top = `${point.y}px`;
  }

  function render() {
    const geometry = getGeometry();
    const phase = getPhase();

    overlay.dataset.templateShape = shape;
    overlay.dataset.templatePhase = phase;
    overlay.classList.toggle(
      "has-template",
      Boolean(geometry)
    );
    overlay.classList.toggle(
      "is-confirmed",
      confirmed
    );

    if (!geometry) {
      path.removeAttribute("d");
      label.textContent = "";
      emitState();
      return;
    }

    path.setAttribute("d", geometry.path);
    path.dataset.templateShape = geometry.shape;
    positionElement(originDot, geometry.anchor);
    positionElement(label, geometry.labelPoint);
    label.textContent = formatTemplateLabel(geometry);
    emitState();
  }

  function clear() {
    cursor = null;
    anchor = null;
    anchorLocked = false;
    confirmed = false;
    render();
  }

  function handlePointerMove(event) {
    if (!enabled || confirmed) return;
    if (event.isPrimary === false) return;

    cursor = pointFromEvent(event);
    render();
  }

  function handlePointerDown(event) {
    if (
      !enabled ||
      event.isPrimary === false ||
      (
        event.pointerType === "mouse" &&
        event.button !== 0
      )
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    syncBounds();
    cursor = pointFromEvent(event);

    if (isDirectionalShape(shape)) {
      if (!anchor || (confirmed && !anchorLocked)) {
        anchor = { ...cursor };
        anchorLocked = false;
        confirmed = false;
      } else if (!confirmed) {
        confirmed = true;
      }
    } else {
      anchor = { ...cursor };
      confirmed = true;
    }

    render();
  }

  function handleKeyDown(event) {
    if (enabled && event.key === "Escape") {
      clear();
    }
  }

  function connect() {
    if (connected) return overlay;
    connected = true;
    surface.appendChild(overlay);
    overlay.addEventListener(
      "pointermove",
      handlePointerMove
    );
    overlay.addEventListener(
      "pointerdown",
      handlePointerDown
    );
    documentRef.addEventListener(
      "keydown",
      handleKeyDown
    );
    windowRef?.addEventListener(
      "resize",
      refresh
    );
    emitState();
    return overlay;
  }

  function setEnabled(nextEnabled) {
    enabled = nextEnabled === true;
    overlay.hidden = !enabled;
    overlay.classList.toggle(
      "is-enabled",
      enabled
    );
    cursor = null;
    anchor = null;
    anchorLocked = false;
    confirmed = false;

    if (enabled) {
      syncBounds();
    }
    render();
    return enabled;
  }

  function toggle() {
    return setEnabled(!enabled);
  }

  function setShape(nextShape) {
    shape = normalizeTemplateShape(nextShape);
    options = {
      ...getDefaultTemplateOptions(shape)
    };
    cursor = null;
    anchor = null;
    anchorLocked = false;
    confirmed = false;
    render();
    return shape;
  }

  function setOptions(nextOptions = {}) {
    options = {
      ...options,
      sizeFeet: normalizeTemplateDistance(
        nextOptions.sizeFeet,
        options.sizeFeet
      ),
      widthFeet: normalizeTemplateDistance(
        nextOptions.widthFeet,
        options.widthFeet
      ),
      angleDegrees: normalizeTemplateAngle(
        nextOptions.angleDegrees,
        options.angleDegrees || 53.130102
      )
    };
    render();
    return Object.freeze({ ...options });
  }

  function setAnchorPoint(
    point,
    {
      locked = true,
      confirm = false
    } = {}
  ) {
    if (!point) {
      anchor = null;
      anchorLocked = false;
      confirmed = false;
      render();
      return null;
    }

    syncBounds();
    const width = Math.max(1, overlay.clientWidth);
    const height = Math.max(1, overlay.clientHeight);
    const xRatio = Number.isFinite(Number(point.xRatio))
      ? clamp(Number(point.xRatio), 0, 1)
      : clamp(Number(point.x) || 0, 0, width) / width;
    const yRatio = Number.isFinite(Number(point.yRatio))
      ? clamp(Number(point.yRatio), 0, 1)
      : clamp(Number(point.y) || 0, 0, height) / height;

    anchor = {
      x: xRatio * width,
      y: yRatio * height,
      xRatio,
      yRatio
    };
    anchorLocked = locked === true;
    confirmed = confirm === true;

    if (
      !cursor ||
      !isDirectionalShape(shape)
    ) {
      cursor = {
        ...anchor,
        x: isDirectionalShape(shape)
          ? Math.min(width, anchor.x + 1)
          : anchor.x,
        xRatio: isDirectionalShape(shape)
          ? Math.min(1, (anchor.x + 1) / width)
          : anchor.xRatio
      };
    }

    render();
    return copyPoint(anchor);
  }

  function refresh() {
    if (!enabled) return;
    syncBounds();
    render();
  }

  function destroy() {
    if (!connected) return;
    connected = false;
    overlay.removeEventListener(
      "pointermove",
      handlePointerMove
    );
    overlay.removeEventListener(
      "pointerdown",
      handlePointerDown
    );
    documentRef.removeEventListener(
      "keydown",
      handleKeyDown
    );
    windowRef?.removeEventListener(
      "resize",
      refresh
    );
    overlay.remove();
  }

  return Object.freeze({
    clear,
    connect,
    destroy,
    getOverlayElement: () => overlay,
    getState,
    refresh,
    setEnabled,
    setAnchorPoint,
    setOptions,
    setShape,
    toggle
  });
}
