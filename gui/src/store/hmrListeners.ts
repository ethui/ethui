/**
 * Tracks event listeners in dev so HMR can clean them up on module reload.
 */
export function createHmrListenerTracker() {
  if (!import.meta.hot) {
    return (_listener: Promise<() => void>) => {};
  }

  const listeners: Array<Promise<() => void>> = [];
  const trackListener = (listener: Promise<() => void>) => {
    listeners.push(listener);
  };

  import.meta.hot.dispose(() => {
    for (const listener of listeners) {
      listener.then((unlisten) => unlisten()).catch(() => {});
    }
  });

  return trackListener;
}
