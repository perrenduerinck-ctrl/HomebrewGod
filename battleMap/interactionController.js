// One owner at a time may capture Battle Map interaction. Existing systems
// can join this controller incrementally without sharing implementation state.

export function createMapInteractionController({ onOwnerChange = null } = {}) {
  let active = null;
  const subscribers = new Set();

  const snapshot = () => active
    ? Object.freeze({ id: active.id, label: active.label })
    : null;

  const notify = (reason) => {
    const state = snapshot();
    subscribers.forEach((subscriber) => subscriber(state, reason));
    if (typeof onOwnerChange === "function") onOwnerChange(state, reason);
  };

  function cancel(reason = "cancelled") {
    if (!active) return false;
    const previous = active;
    active = null;
    try {
      previous.cancel?.(reason);
    } finally {
      notify(reason);
    }
    return true;
  }

  function acquire({ id, label = "Map action", cancel: cancelOwner = null } = {}) {
    const ownerId = String(id || "").trim();
    if (!ownerId) throw new Error("Map interaction ownership needs an ID.");
    if (active?.id === ownerId) cancel("replaced");
    else cancel("superseded");
    active = { id: ownerId, label: String(label || "Map action"), cancel: cancelOwner };
    notify("acquired");
    return () => {
      if (active?.id !== ownerId) return false;
      active = null;
      notify("released");
      return true;
    };
  }

  function subscribe(subscriber) {
    subscribers.add(subscriber);
    subscriber(snapshot(), "subscribe");
    return () => subscribers.delete(subscriber);
  }

  return Object.freeze({
    acquire,
    cancel,
    getState: snapshot,
    subscribe
  });
}
