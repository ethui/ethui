import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import truncateEthAddress from "truncate-eth-address";

import { useStore } from "@iron/state";
import { CurrentBlock } from "@iron/ui/components";
import { useProvider } from "@iron/ui/hooks";

export function HomePage() {
  const provider = useProvider();
  const address = useStore(({ wallet }) => wallet.address);
  const [balance, setBalance] = useState("");

  const getBalance = async () => {
    const balance = await provider
      .getBalance(address)
      .then((balance) => balance);

    setBalance(ethers.utils.formatEther(balance));
  };

  useEffect(() => {
    getBalance();
  }, [provider, address, balance]);

  return (
    <>
      <div>{truncateEthAddress(address)}</div>
      <div>{balance} ETH</div>
      <CurrentBlock />
    </>
  );
}
