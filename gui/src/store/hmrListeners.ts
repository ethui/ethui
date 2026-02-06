export const createHmrListenerTracker = () => {
  const listeners: Array<Promise<() => void>> = [];

  const trackListener = (listener: Promise<() => void>) => {
    listeners.push(listener);
  };

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      for (const listener of listeners) {
        listener.then((unlisten) => unlisten()).catch(() => {});
      }
    });
  }

  return trackListener;
};
