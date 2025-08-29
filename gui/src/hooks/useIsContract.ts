import { useInvoke } from "#/hooks/useInvoke";

export function useIsContract(
  address: `0x${string}` | undefined,
  chainId: number,
) {
  const { data, isLoading, error } = useInvoke<boolean>("rpc_is_contract", {
    address,
    chainId,
  });

  return {
    isLoading,
    isContract: data === true,
    isError: !!error,
  };
}
