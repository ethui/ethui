import { type SnackbarKey, useSnackbar } from "notistack";
import { useEffect } from "react";

import { Button } from "@ethui/ui/components/shadcn/button";
import { Link } from "@tanstack/react-router";
import { CircleX, SquareArrowOutUpRight } from "lucide-react";
import { useNetworks } from "#/store/useNetworks";
import { useSettings } from "#/store/useSettings";
import { useInvoke } from "./useInvoke";

let key: SnackbarKey;

export function useNoticeAlchemyKeyMissing() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
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
      closeSnackbar(key);
      return;
    }

    key = enqueueSnackbar(<span>Alchemy key missing</span>, {
      key: "alchemy_key_missing",
      persist: true,
      variant: "warning",
      action: () => (
        <>
          <Link
            href="/home/settings/general"
            aria-label="close"
            color="inherit"
          >
            <SquareArrowOutUpRight />
          </Link>
          <Button
            size="icon"
            aria-label="close"
            color="inherit"
            onClick={() => closeSnackbar(key)}
          >
            <CircleX />
          </Button>
        </>
      ),
    });
  }, [closeSnackbar, enqueueSnackbar, requiresAlchemyKey]);
}
