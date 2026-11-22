// Preserve the user's place when a choice redraws the current creator step.
export function captureCreatorViewPosition(root, target) {
  if (!root?.contains(target)) return null;
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  const identify = element => {
    if (element.id) return {id:element.id};
    const attributes = Array.from(element.attributes || []).filter(attribute => attribute.name.startsWith("data-") && !attribute.name.startsWith("data-hg-")).map(attribute => [attribute.name,attribute.value]);
    return attributes.length ? {tag:element.tagName,attributes} : null;
  };
  const find = identity => {
    if (!identity) return null;
    if (identity.id) { const element=doc.getElementById(identity.id);return root.contains(element) ? element : null; }
    return Array.from(root.querySelectorAll(identity.tag)).find(element => identity.attributes.every(([name,value]) => element.getAttribute(name) === value)) || null;
  };
  const identity = identify(target);
  const top = target.getBoundingClientRect().top;
  const scrollX = view.scrollX;
  const scrollY = view.scrollY;
  const ancestors = [];
  for (let element=target.parentElement;element && element!==doc.documentElement;element=element.parentElement) {
    if (element.scrollTop || element.scrollLeft) ancestors.push({element,identity:identify(element),top:element.scrollTop,left:element.scrollLeft});
  }
  const opened = Array.from(root.querySelectorAll("details[open]")).map(element => ({identity:identify(element),summary:element.querySelector(":scope > summary")?.textContent.trim()}));
  return () => {
    if (target.isConnected) return;
    for (const entry of opened) {
      const matching = Array.from(root.querySelectorAll("details")).filter(element => element.querySelector(":scope > summary")?.textContent.trim() === entry.summary);
      const details = find(entry.identity) || (matching.length === 1 ? matching[0] : null);
      if (details) details.open = true;
    }
    const replacement = find(identity);
    if (replacement && (!doc.activeElement || doc.activeElement === doc.body || doc.activeElement === replacement)) replacement.focus?.({preventScroll:true});
    for (const entry of ancestors) {
      const element=entry.element.isConnected ? entry.element : find(entry.identity);
      if (element) {element.scrollTop=entry.top;element.scrollLeft=entry.left;}
    }
    view.scrollTo({left:scrollX,top:scrollY,behavior:"instant"});
    if (replacement) view.scrollBy({top:replacement.getBoundingClientRect().top-top,behavior:"instant"});
  };
}
