import { useContext } from "react";

import { WalletsContext } from "../components/ProviderWallets";

export function useWallets() {
  return useContext(WalletsContext);
}
