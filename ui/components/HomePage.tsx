import { BigNumber, ethers } from "ethers";
import { useEffect, useState } from "react";
import truncateEthAddress from "truncate-eth-address";

import { CurrentBlock } from "@iron/ui/components";
import { useProvider } from "@iron/ui/hooks";

import { useSettings } from "../hooks/useSettings";

export function HomePage() {
  const settings = useSettings();
  const { provider } = useProvider();
  const [balance, setBalance] = useState(BigNumber.from(0));

  const address = settings.data?.wallet.address;

  useEffect(() => {
    if (!address) return;
    async () => setBalance(await provider!.getBalance(address));
  }, [provider, address, balance]);

  return (
    <>
      <div>{address && truncateEthAddress(address)}</div>
      {balance && <div>{ethers.utils.formatEther(balance)} ETH</div>}
      <CurrentBlock />
    </>
  );
}
