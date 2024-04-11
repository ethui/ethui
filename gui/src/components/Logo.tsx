import { useTheme } from "@/store/theme";

export function Logo({ width }: { width: number }) {
  const darkMode = useTheme((s) => s.mode === "dark");
  const logo = darkMode ? "/logo/symbol-white.svg" : "/logo/symbol-black.svg";

  return <img width={width} src={logo} />;
}
