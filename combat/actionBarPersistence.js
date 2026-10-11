export function subscribeToActionBarDocument({
  onSnapshot,
  reference,
  onNext,
  onError
} = {}) {
  if (typeof onSnapshot !== "function") {
    throw new TypeError("Action bar persistence requires Firestore onSnapshot.");
  }
  if (!reference) {
    throw new Error("Action bar persistence requires a document reference.");
  }
  return onSnapshot(reference, onNext, onError);
}
