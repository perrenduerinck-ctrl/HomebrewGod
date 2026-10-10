export function isBackForwardCacheEvent(event) {
  return event?.persisted === true;
}

export function shouldTearDownPage(event) {
  return !isBackForwardCacheEvent(event);
}
