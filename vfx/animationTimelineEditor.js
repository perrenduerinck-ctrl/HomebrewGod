import { animationLayerOverrides } from "./animationLayers.js";

const ZOOM_LEVELS = Object.freeze([40, 80, 120, 240]);
const LABEL_WIDTH = 112;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createAnimationTimelineEditor({ container, library, getDefinition, getLayers, resolveTiming,
  updateLayerDelay, play = () => {}, pause = () => {}, stop = () => {}, replay = () => {} } = {}) {
  if (!container) return { refresh() {}, setPlayhead() {}, reset() {}, destroy() {} };
  container.innerHTML = `<div class="hg-animation-timeline-toolbar"><div class="hg-animation-timeline-transport">
    <button type="button" data-timeline-play>▶ Play</button><button type="button" data-timeline-pause>Pause</button><button type="button" data-timeline-stop>Stop</button><button type="button" data-timeline-replay>Replay</button></div>
    <div class="hg-animation-timeline-zoom"><button type="button" data-timeline-zoom-out aria-label="Zoom timeline out">−</button><output data-timeline-zoom-label></output><button type="button" data-timeline-zoom-in aria-label="Zoom timeline in">+</button></div></div>
    <div data-timeline-scroll class="hg-animation-timeline-scroll"><div data-timeline-content class="hg-animation-timeline-content"><div data-timeline-ruler class="hg-animation-timeline-ruler"></div><div data-timeline-tracks></div><div data-timeline-playhead class="hg-animation-timeline-playhead"><span data-timeline-playhead-label>0.00s</span></div></div></div>
    <p data-timeline-info class="hg-animation-hint">Timeline uses the shared animation player timing.</p>`;
  const field = name => container.querySelector(`[data-timeline-${name}]`), doc = container.ownerDocument;
  let tracks = [], totalMs = 3000, playheadMs = 0, zoomIndex = 1, revision = 0, refreshTimer = 0, destroyed = false, dragging = null;
  const listeners = [], on = (node, event, fn) => { node.addEventListener(event, fn); listeners.push(() => node.removeEventListener(event, fn)); };
  const run = fn => { try { Promise.resolve(fn()).catch(error => { field("info").textContent = error.message || "Timeline action failed."; }); } catch (error) { field("info").textContent = error.message || "Timeline action failed."; } };
  const zoom = () => ZOOM_LEVELS[zoomIndex];
  function markerTime(prepared, event, start) {
    const frameIndex = prepared.timing.frames.indexOf(event.frame);
    return frameIndex < 0 ? null : start + frameIndex * 1000 / (prepared.definition.fps * prepared.timing.speed);
  }
  function makeTrack(prepared, { label, layerIndex = null, start = 0, indefinite = false } = {}) {
    const markers = (prepared.definition.events || []).flatMap(event => {
      const at = markerTime(prepared, event, start);
      return at == null ? [] : [{ at, label: event.type || "Event", kind: "event" }];
    });
    if (prepared.definition.sound) {
      const at = markerTime(prepared, { frame: prepared.definition.sound.startFrame }, start);
      if (at != null) markers.push({ at, label: "Sound", kind: "sound" });
    }
    return { label, animationId: prepared.definition.id, layerIndex, start, duration: prepared.duration, indefinite, markers };
  }
  async function loadTracks() {
    const definition = getDefinition(), layers = getLayers();
    const base = await resolveTiming(definition, {});
    const next = [makeTrack(base, { label: definition.name || "Base", start: definition.timing.startDelay * 1000, indefinite: base.untilCancelled })];
    const children = await Promise.all(layers.map(async (layer, index) => {
      const animation = library.getAnimation(layer.animationId);
      if (!animation) throw new Error(`Layer ${index + 1} needs an available Animation ID.`);
      const prepared = await resolveTiming(layer.animationId, animationLayerOverrides(layer));
      return makeTrack(prepared, { label: animation.name, layerIndex: index,
        start: layer.startDelay * 1000 + prepared.definition.timing.startDelay * 1000, indefinite: prepared.untilCancelled });
    }));
    return [...next, ...children];
  }
  function render() {
    const pixels = zoom(), visibleMs = Math.max(3000, totalMs), canvasWidth = Math.max(600, Math.ceil(visibleMs / 1000 * pixels) + 24);
    field("zoom-label").textContent = `${pixels} px / second`;
    field("zoom-out").disabled = zoomIndex === 0; field("zoom-in").disabled = zoomIndex === ZOOM_LEVELS.length - 1;
    field("content").style.width = `${LABEL_WIDTH + canvasWidth}px`; field("content").style.setProperty("--timeline-second", `${pixels}px`);
    field("ruler").style.marginLeft = `${LABEL_WIDTH}px`; field("ruler").style.width = `${canvasWidth}px`;
    const ruler = doc.createDocumentFragment(), seconds = Math.ceil(visibleMs / 1000);
    for (let second = 0; second <= seconds; second++) {
      const tick = doc.createElement("span"); tick.style.left = `${second * pixels}px`; tick.textContent = `${second}s`; ruler.appendChild(tick);
    }
    field("ruler").replaceChildren(ruler);
    const fragment = doc.createDocumentFragment();
    for (const track of tracks) {
      const row = doc.createElement("div"); row.className = "hg-animation-timeline-row";
      const label = doc.createElement("span"); label.className = "hg-animation-timeline-track-label"; label.textContent = track.layerIndex == null ? `Base · ${track.label}` : `L${track.layerIndex + 1} · ${track.label}`;
      const canvas = doc.createElement("div"); canvas.className = "hg-animation-timeline-canvas"; canvas.style.width = `${canvasWidth}px`;
      const block = doc.createElement("button"); block.type = "button"; block.className = "hg-animation-timeline-block"; block.style.left = `${track.start / 1000 * pixels}px`; block.style.width = `${Math.max(24, track.duration / 1000 * pixels)}px`;
      block.textContent = `${track.indefinite ? "∞" : `${(track.duration / 1000).toFixed(2)}s`}`; block.title = `${track.label} · starts ${(track.start / 1000).toFixed(2)}s`;
      if (track.layerIndex == null) block.disabled = true;
      else { block.dataset.timelineLayer = String(track.layerIndex); block.setAttribute("aria-label", `Move ${track.label} layer start`); block.setAttribute("aria-valuemin", "0"); block.setAttribute("aria-valuemax", "10"); block.setAttribute("aria-valuenow", String(track.start / 1000)); }
      canvas.appendChild(block);
      for (const marker of track.markers) {
        const node = doc.createElement("span"); node.className = `hg-animation-timeline-marker hg-animation-timeline-marker-${marker.kind}`; node.style.left = `${marker.at / 1000 * pixels}px`;
        node.title = `${marker.label} · ${(marker.at / 1000).toFixed(2)}s`; node.setAttribute("aria-label", node.title); node.textContent = marker.kind === "sound" ? "▲" : "◆"; canvas.appendChild(node);
      }
      row.append(label, canvas); fragment.appendChild(row);
    }
    field("tracks").replaceChildren(fragment); setPlayhead(playheadMs);
  }
  async function refresh() {
    clearTimeout(refreshTimer); const current = ++revision;
    try {
      const next = await loadTracks();
      if (destroyed || current !== revision) return;
      tracks = next; totalMs = Math.max(3000, ...tracks.map(track => track.start + track.duration), ...tracks.flatMap(track => track.markers.map(marker => marker.at + 100)));
      field("info").textContent = `${tracks.length} track${tracks.length === 1 ? "" : "s"} · timing supplied by Animation Player · drag a layer block to change its start delay.`;
      render();
    } catch (error) {
      if (destroyed || current !== revision) return;
      tracks = []; totalMs = 3000; field("info").textContent = error.message || "Complete the animation settings to build its timeline."; render();
    }
  }
  function scheduleRefresh() { clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, 120); }
  function setPlayhead(value) {
    playheadMs = clamp(Number(value) || 0, 0, Math.max(totalMs, 1));
    field("playhead").style.left = `${LABEL_WIDTH + playheadMs / 1000 * zoom()}px`;
    field("playhead-label").textContent = `${(playheadMs / 1000).toFixed(2)}s`;
  }
  function startDrag(event, block) {
    const layerIndex = Number(block.dataset.timelineLayer); if (!Number.isInteger(layerIndex)) return;
    event.preventDefault(); block.setPointerCapture?.(event.pointerId);
    dragging = { pointerId: event.pointerId, block, canvas: block.parentElement, layerIndex };
  }
  function moveDrag(event) {
    if (!dragging || event.pointerId !== dragging.pointerId) return;
    const rect = dragging.canvas.getBoundingClientRect(), seconds = clamp((event.clientX - rect.left) / zoom(), 0, 10);
    const value = Math.round(seconds * 20) / 20;
    dragging.block.style.left = `${value * zoom()}px`; dragging.block.setAttribute("aria-valuenow", String(value)); dragging.block.title = `Starts ${value.toFixed(2)}s`;
    updateLayerDelay(dragging.layerIndex, value, { notify: false });
  }
  function endDrag(event) {
    if (!dragging || event.pointerId !== dragging.pointerId) return;
    const value = Number(dragging.block.getAttribute("aria-valuenow")); updateLayerDelay(dragging.layerIndex, value, { notify: true }); dragging = null; scheduleRefresh();
  }
  on(container, "pointerdown", event => { const block = event.target.closest("[data-timeline-layer]"); if (block) startDrag(event, block); });
  on(container, "pointermove", moveDrag); on(container, "pointerup", endDrag); on(container, "pointercancel", endDrag);
  on(container, "keydown", event => {
    const block = event.target.closest("[data-timeline-layer]"); if (!block || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault(); const index = Number(block.dataset.timelineLayer), value = clamp(Number(block.getAttribute("aria-valuenow")) + (event.key === "ArrowRight" ? .05 : -.05), 0, 10);
    updateLayerDelay(index, Number(value.toFixed(2)), { notify: true }); scheduleRefresh();
  });
  on(field("zoom-out"), "click", () => { if (zoomIndex > 0) { zoomIndex--; render(); } });
  on(field("zoom-in"), "click", () => { if (zoomIndex < ZOOM_LEVELS.length - 1) { zoomIndex++; render(); } });
  on(field("play"), "click", () => { field("pause").textContent = "Pause"; run(play); });
  on(field("pause"), "click", () => run(async () => { const paused = await pause(); field("pause").textContent = paused ? "Resume" : "Pause"; }));
  on(field("stop"), "click", () => { field("pause").textContent = "Pause"; run(stop); });
  on(field("replay"), "click", () => { field("pause").textContent = "Pause"; run(replay); });
  render();
  return { refresh, scheduleRefresh, setPlayhead, reset() { setPlayhead(0); },
    destroy() { if (destroyed) return; destroyed = true; revision++; clearTimeout(refreshTimer); listeners.forEach(remove => remove()); tracks = []; } };
}
