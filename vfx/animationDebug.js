// Optional overlay owned and disposed by the same effect instance.
export function createAnimationDebug(container) {
  const document = container.ownerDocument, ns = "http://www.w3.org/2000/svg";
  const root = document.createElement("div"); root.className = "hg-animation-runtime-debug";
  root.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:9999";
  const svg = document.createElementNS(ns, "svg"); svg.style.cssText = "width:100%;height:100%;overflow:visible";
  const line = document.createElementNS(ns, "path"); line.setAttribute("stroke", "#ffdf60"); line.setAttribute("fill", "none"); line.setAttribute("stroke-dasharray", "5 4"); svg.append(line);
  const marks = ["SOURCE", "TARGET", "IMPACT"].map((label, i) => {
    const group = document.createElementNS(ns, "g"), circle = document.createElementNS(ns, "circle"), text = document.createElementNS(ns, "text");
    circle.setAttribute("r", i === 2 ? "3" : "5"); circle.setAttribute("fill", ["#5cdaff", "#ff83a2", "#ffdf60"][i]);
    text.textContent = label; text.setAttribute("y", "-10"); text.setAttribute("fill", "#ffffff"); text.style.font = "bold 10px system-ui";
    group.append(circle, text); svg.append(group); return group;
  });
  const readout = document.createElement("output"); readout.style.cssText = "position:absolute;bottom:4px;left:4px;background:#071322e8;color:white;padding:4px;font:11px system-ui;white-space:pre-line";
  root.append(svg, readout); container.append(root);
  return { update({ source, target, angle, distance }, arc = 0) {
    [source, target, target].forEach((p, i) => marks[i].setAttribute("transform", `translate(${p.x} ${p.y})`));
    line.setAttribute("d", `M ${source.x} ${source.y} Q ${(source.x + target.x) / 2} ${(source.y + target.y) / 2 - arc * 2} ${target.x} ${target.y}`);
    readout.textContent = `Source ${source.x.toFixed(1)}, ${source.y.toFixed(1)} · Target ${target.x.toFixed(1)}, ${target.y.toFixed(1)}\nAngle ${angle.toFixed(1)}° · Distance ${distance.toFixed(1)} px`;
  }, destroy() { root.remove(); } };
}
