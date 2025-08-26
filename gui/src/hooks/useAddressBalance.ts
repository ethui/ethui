import { useInvoke } from "#/hooks/useInvoke";
import type { Address } from "viem";

export function useAddressBalance(address: Address, chainId: number) {
  const { data, isLoading, error } = useInvoke<string>(
    "sync_get_native_balance",
    {
      address,
      chainId,
    },
  );

  return {
    balance: data ? BigInt(data) : undefined,
    isLoading,
    isError: !!error,
  };
}
