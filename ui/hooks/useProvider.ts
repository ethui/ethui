import { ethers } from "ethers";
import { useStore } from "@iron/state";

export function useProvider() {
  const rpc = useStore((state) => state.rpc);

  let provider = new ethers.providers.JsonRpcProvider(rpc);

  return provider;
}
