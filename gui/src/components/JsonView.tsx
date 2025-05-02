import JsonView from "react18-json-view";
import { useTheme } from "#/store/useTheme";

export function Json({ src }: { src: any }) {
  const isDark = useTheme((s) => s.mode === "dark");

  return (
    <JsonView
      src={src}
      dark={isDark}
      theme="github"
      collapseStringsAfterLength={30}
    />
  );
}
