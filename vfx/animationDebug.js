const pointPath = ({ source, target, arcHeight = 0 }) => arcHeight
  ? `M ${source.x} ${source.y} Q ${(source.x + target.x) / 2} ${(source.y + target.y) / 2 - arcHeight * 2} ${target.x} ${target.y}`
  : `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
const yesNo = value => value ? "Yes" : "No";
const distanceLabel = value => value == null ? "—" : `${value < 10 ? value.toFixed(1) : Math.round(value)} ft`;

// Optional overlay owned and disposed by the same effect instance.
export function createAnimationDebug(container) {
  const document = container.ownerDocument, ns = "http://www.w3.org/2000/svg";
  const root = document.createElement("div"); root.className = "hg-animation-runtime-debug";
  const svg = document.createElementNS(ns, "svg");
  const defs = document.createElementNS(ns, "defs"), arrow = document.createElementNS(ns, "marker"), arrowPath = document.createElementNS(ns, "path");
  arrow.id = `hg-animation-debug-arrow-${Math.random().toString(36).slice(2)}`; arrow.setAttribute("viewBox", "0 0 10 10"); arrow.setAttribute("refX", "9"); arrow.setAttribute("refY", "5"); arrow.setAttribute("markerWidth", "5"); arrow.setAttribute("markerHeight", "5"); arrow.setAttribute("orient", "auto-start-reverse");
  arrowPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z"); arrowPath.setAttribute("fill", "#86d9ff"); arrow.append(arrowPath); defs.append(arrow); svg.append(defs);
  const direction = document.createElementNS(ns, "path"); direction.classList.add("hg-animation-debug-direction"); direction.setAttribute("marker-end", `url(#${arrow.id})`);
  const path = document.createElementNS(ns, "path"); path.classList.add("hg-animation-debug-path");
  const distance = document.createElementNS(ns, "text"); distance.classList.add("hg-animation-debug-distance");
  svg.append(direction, path, distance);
  const markSettings = [["SOURCE", "#5cdaff", 5], ["TARGET", "#ff83a2", 5], ["SPAWN", "#b7a7ff", 4], ["IMPACT", "#ffdf60", 4], ["PIVOT", "#7dffb2", 3]];
  const marks = Object.fromEntries(markSettings.map(([markLabel, color, radius]) => {
    const group = document.createElementNS(ns, "g"), circle = document.createElementNS(ns, "circle"), text = document.createElementNS(ns, "text");
    group.dataset.debugMarker = markLabel.toLowerCase(); circle.setAttribute("r", String(radius)); circle.setAttribute("fill", color);
    text.textContent = markLabel; text.setAttribute("y", "-10");
    group.append(circle, text); svg.append(group); return [markLabel.toLowerCase(), group];
  }));
  const readout = document.createElement("output"); readout.className = "hg-animation-debug-info"; readout.dataset.animationDebugInfo = "";
  root.append(svg, readout); container.append(root);
  return { update(debug) {
    for (const [key, point] of Object.entries({ source: debug.source, target: debug.target, spawn: debug.spawn, impact: debug.impact, pivot: debug.pivot })) {
      marks[key].setAttribute("transform", `translate(${point.x} ${point.y})`);
    }
    direction.setAttribute("d", pointPath({ source: debug.source, target: debug.target }));
    path.setAttribute("d", pointPath(debug.path)); path.dataset.pathKind = debug.path.kind;
    path.setAttribute("stroke-width", debug.path.kind === "beam" ? "6" : "2");
    distance.setAttribute("x", String((debug.source.x + debug.target.x) / 2)); distance.setAttribute("y", String((debug.source.y + debug.target.y) / 2 - 8)); distance.textContent = distanceLabel(debug.distanceFeet);
    root.dataset.behavior = debug.behavior; root.dataset.pathKind = debug.path.kind;
    readout.textContent = `SOURCE → TARGET\nDistance: ${distanceLabel(debug.distanceFeet)} (${debug.distance.toFixed(1)} px)\nBehavior: ${debug.behavior}\nPlacement: ${debug.placement}\nFacing: ${debug.facing}\nFollow Source: ${yesNo(debug.followSource)}\nFollow Target: ${yesNo(debug.followTarget)}\nAngle: ${debug.facingAngle.toFixed(1)}°`;
  }, destroy() { root.remove(); } };
}
