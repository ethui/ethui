import { ethers } from "ethers";
import { useEffect, useState } from "react";

import * as Constants from "@iron/constants";

export function useProvider() {
  // TODO: replace with state later
  const network = Constants.networks[0];

  const [provider, setProvider] = useState(
    new ethers.providers.JsonRpcProvider(network.url)
  );

  useEffect(() => {
    setProvider(new ethers.providers.JsonRpcProvider(network.url));
  }, [network.url]);

  return provider;
}
