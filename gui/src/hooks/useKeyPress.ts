import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

export const useKeyPress = (
  keys: string[],
  modifiers: { alt?: boolean; meta?: boolean; ctrl?: boolean; shift?: boolean },
  callback: (event: KeyboardEvent) => unknown,
  node = null,
) => {
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

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
    [keys, modifiers],
  );

  useEffect(() => {
    const targetNode = node ?? document;
    targetNode && targetNode.addEventListener("keydown", handleKeyPress);

    return () =>
      targetNode && targetNode.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress, node]);
};
