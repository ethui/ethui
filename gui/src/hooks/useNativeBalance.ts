import { useContext } from "react";

import { NativeBalanceContext } from "../components/ProviderNativeBalance";

export function useNativeBalance() {
  return useContext(NativeBalanceContext);
}
