import { useInvoke } from "#/hooks/useInvoke";
import { useNetworks } from "#/store/useNetworks";

export function useIsAnvilNetwork() {
  const current = useNetworks((s) => s.current);

  return useInvoke<boolean>(
    "networks_is_dev",
    current ? { dedupChainId: current.dedup_chain_id } : {},
    { enabled: !!current },
  );
}
