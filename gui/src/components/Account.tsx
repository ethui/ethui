import { useWallets } from "@/store";

import { BalancesList, Panel } from "./";

export function Account() {
  const address = useWallets((s) => s.address);

  if (!address) return null;

  return (
    <Panel>
      <BalancesList />
    </Panel>
  );
}
