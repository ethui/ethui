import { useEffect, useState } from "react";

import { useStore } from "@iron/state";

import { useProvider } from "../hooks";

export function CurrentNonce() {
  const provider = useProvider();
  const address = useStore(({ wallet }) => wallet.address);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const update = async () =>
      setNonce(await provider.getTransactionCount(address));

    update();
  }, [address, provider]);

  return <p>Nonce: {nonce}</p>;
}
