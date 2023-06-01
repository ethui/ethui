import { useContext } from "react";

import { TokensBalancesContext } from "../components/ProviderTokensBalances";

export function useTokensBalances() {
  return useContext(TokensBalancesContext);
}
