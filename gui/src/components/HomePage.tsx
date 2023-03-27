import { BigNumber, ethers } from "ethers";
import { useEffect, useState } from "react";
import truncateEthAddress from "truncate-eth-address";

import { CurrentBlock } from ".";
import { useAccount, useProvider } from "../hooks";

export function HomePage() {
  const provider = useProvider();
  const address = useAccount();
  const [balance, setBalance] = useState(BigNumber.from(0));

  useEffect(() => {
    if (!address || !provider) return;
    async () => setBalance(await provider.getBalance(address));
  }, [provider, address, balance]);

  return (
    <>
      <div>{address && truncateEthAddress(address)}</div>
      {balance && <div>{ethers.utils.formatEther(balance)} ETH</div>}
      <CurrentBlock />
    </>
  );
}
