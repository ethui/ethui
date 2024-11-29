import { useEffect } from "react";

import { Link } from "@tanstack/react-router";
import { ToastAction } from "@ethui/ui/components/shadcn/toast";
import { useNetworks } from "#/store/useNetworks";
import { useSettings } from "#/store/useSettings";
import { useInvoke } from "./useInvoke";
import { toast } from "@ethui/ui/hooks/use-toast";

export function useNoticeAlchemyKeyMissing() {
  const { settings } = useSettings();
  const currentNetwork = useNetworks((s) => s.current);

  const { data: isSupportedNetwork, isLoading: isLoadingSupportedNetwork } =
    useInvoke<boolean>("sync_alchemy_is_network_supported", {
      chainId: currentNetwork?.chain_id,
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
