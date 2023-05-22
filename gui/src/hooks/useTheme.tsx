import { useContext } from "react";

import { ThemeContext } from "../components/ProviderTheme";

export function useTheme() {
  return useContext(ThemeContext);
}
