import { useChainId, useReadContracts } from "wagmi";
import { nftAbi, nftAddress } from "./wagmi.generated";

export function useReadsNftTokenUri(configs: object[] = [] as object) {
  const chainId = useChainId();

  const reads = configs.map((config) => {
    return {
      abi: nftAbi,
      address: nftAddress[chainId as keyof typeof nftAddress],
      functionName: "tokenURI",
      ...config,
    };
  });

  return useReadContracts({ contracts: reads });
}
