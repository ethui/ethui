import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

export const useKeyPress = (
  keys: string[],
  modifiers: { alt?: boolean; meta?: boolean; ctrl?: boolean; shift?: boolean },
  callback: (event: KeyboardEvent) => unknown,
  node = null
) => {
  // implement the callback ref pattern
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  // handle what happens on key press
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      const { metaKey, ctrlKey, altKey, shiftKey } = event;

      if (
        keys.some((key) => event.key === key) &&
        metaKey === !!modifiers.meta &&
        ctrlKey === !!modifiers.ctrl &&
        altKey === !!modifiers.alt &&
        shiftKey === !!modifiers.shift
      ) {
        callbackRef.current(event);
      }
    },
    [keys, modifiers]
  );

  useEffect(() => {
    // target is either the provided node or the document
    const targetNode = node ?? document;
    // attach the event listener
    targetNode && targetNode.addEventListener("keydown", handleKeyPress);

    // remove the event listener
    return () =>
      targetNode && targetNode.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress, node]);
};
