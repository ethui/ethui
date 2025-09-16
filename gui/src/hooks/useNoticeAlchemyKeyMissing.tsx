import { ToastAction } from "@ethui/ui/components/shadcn/toast";
import { toast } from "@ethui/ui/hooks/use-toast";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNetworks } from "#/store/useNetworks";
import { useSettings } from "#/store/useSettings";
import { useInvoke } from "./useInvoke";

export function useNoticeAlchemyKeyMissing() {
  const { settings } = useSettings();
  const currentNetwork = useNetworks((s) => s.current);

  const { data: isSupportedNetwork, isLoading: isLoadingSupportedNetwork } =
    useInvoke<boolean>("sync_alchemy_is_network_supported", {
      chainId: currentNetwork?.id.chain_id,
    });

  const isLoading = !settings || isLoadingSupportedNetwork;

  const requiresAlchemyKey =
    !isLoading && isSupportedNetwork && !settings?.alchemyApiKey;

  useEffect(() => {
    if (!requiresAlchemyKey) {
      return;
    }

    toast({
      title: "Alchemy key missing",
      description: "Transaction history for livenets not available",
      action: (
        <ToastAction altText="Set key" asChild>
          <Link to="/home/settings/general">Set key</Link>
        </ToastAction>
      ),
    });
  }, [requiresAlchemyKey]);
}
