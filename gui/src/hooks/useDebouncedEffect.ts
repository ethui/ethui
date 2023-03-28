import { debounce } from "lodash";
import { useCallback, useEffect, useState } from "react";

export function useDebouncedEffect(
  callback: () => void,
  dependency: unknown[],
  timeout = 300,
  options = { trailing: true, leading: false }
) {
  const { leading, trailing } = options;
  // the source of truth will be _dependencyRef.current  always
  const [innerDependency, setdependency] = useState(dependency);

  // making use of second approach here we discussed above
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const makeChangeTodependency = useCallback(
    debounce(
      (dependency) => {
        setdependency(dependency);
      },
      timeout,
      { trailing, leading }
    ),
    [trailing, leading, timeout, setdependency]
  );

  useEffect(() => {
    if (dependency) {
      makeChangeTodependency(dependency);
    }
  }, [dependency, makeChangeTodependency]);

  useEffect(callback, [innerDependency, callback]);
}
