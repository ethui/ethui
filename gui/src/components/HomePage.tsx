import { useEffect, useState } from "react";
import truncateEthAddress from "truncate-eth-address";
import { formatEther } from "viem";

import { CurrentBlock } from ".";
import { useAccount, useClient } from "../hooks";

export function HomePage() {
  const client = useClient();
  const address = useAccount();
  const [balance, setBalance] = useState<bigint>();

  useEffect(() => {
    if (!address || !client) return;
    async () => setBalance(await client.getBalance({ address }));
  }, [client, address, balance]);

  return (
    <>
      <div>{address && truncateEthAddress(address)}</div>
      {balance && <div>{formatEther(balance)} ETH</div>}
      <CurrentBlock />
    </>
  );
}
