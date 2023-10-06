import { useTheme } from "@/store/theme";

export function Logo({ width }: { width: number }) {
  const darkMode = useTheme((s) => s.mode === "dark");
  const logo = darkMode ? "logo/logo-white.svg" : "logo/logo-black.svg";

  return <img width={width} src={logo} />;
}
