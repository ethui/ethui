import { BigNumber, ethers } from "ethers";
import { useEffect, useState } from "react";
import truncateEthAddress from "truncate-eth-address";

import { useStore } from "@iron/state";
import { CurrentBlock } from "@iron/ui/components";
import { CurrentNonce } from "@iron/ui/components";
import { useProvider } from "@iron/ui/hooks";

export function HomePage() {
  const provider = useProvider();
  const address = useStore(({ wallet }) => wallet.address);
  const [balance, setBalance] = useState(BigNumber.from(0));

  useEffect(() => {
    async () => setBalance(await provider.getBalance(address));
  }, [provider, address, balance]);

  return (
    <>
      <div>{truncateEthAddress(address)}</div>
      {balance && <div>{ethers.utils.formatEther(balance)} ETH</div>}
      <CurrentBlock />
      <CurrentNonce />
    </>
  );
}
