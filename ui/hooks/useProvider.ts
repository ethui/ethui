import { ethers } from "ethers";
import { useEffect, useState } from "react";

import { useStore } from "@iron/state";

export function useProvider() {
  const network = useStore(({ network }) => network.networks[network.current]);

  const [provider, setProvider] = useState(
    new ethers.providers.JsonRpcProvider(network.url)
  );

  useEffect(() => {
    setProvider(new ethers.providers.JsonRpcProvider(network.url));
  }, [network.url]);

  return provider;
}
