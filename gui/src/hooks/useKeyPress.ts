import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

export const useKeyPress = (
  keys: number[] | string[],
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

      const keyString = event.key;

      if (
        keys.some((key) => key.toString() === keyString) && // Convert the keys of the array to string
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
    targetNode?.addEventListener("keydown", handleKeyPress);

    return () => targetNode?.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress, node]);
};
