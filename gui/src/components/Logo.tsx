import { useTheme } from "@/store/theme";

const { NODE_ENV } = import.meta.env;

export function Logo({ width }: { width: number }) {
  const darkMode = useTheme((s) => s.mode === "dark");
  const color =
    NODE_ENV === "development" ? "purple" : darkMode ? "white" : "black";
  const logo = `/logo/symbol-${color}.svg`;

  return <img width={width} src={logo} alt="Logo" />;
}
