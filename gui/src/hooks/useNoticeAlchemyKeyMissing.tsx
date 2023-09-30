import { Close, OpenInNew } from "@mui/icons-material";
import { IconButton, Typography } from "@mui/material";
import { SnackbarKey, useSnackbar } from "notistack";
import { useEffect } from "react";

import { useNetworks, useSettings, useSettingsWindow } from "../store";
import { useInvoke } from "./tauri";

let key: SnackbarKey;

export function useNoticeAlchemyKeyMissing() {
  const { open } = useSettingsWindow();
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
    if (!requiresAlchemyKey) return closeSnackbar(key);

    key = enqueueSnackbar(
      <>
        <Typography>Alchemy key missing</Typography>
      </>,
      {
        key: "alchemy_key_missing",
        preventDuplicate: true,
        anchorOrigin: { vertical: "bottom", horizontal: "right" },
        persist: true,
        variant: "warning",
        action: () => (
          <>
            <IconButton
              aria-label="close"
              color="inherit"
              sx={{ p: 0.5 }}
              onClick={() => open()}
            >
              <OpenInNew />
            </IconButton>
            <IconButton
              aria-label="close"
              color="inherit"
              sx={{ p: 0.5 }}
              onClick={() => closeSnackbar(key)}
            >
              <Close />
            </IconButton>
          </>
        ),
      },
    );
  }, [closeSnackbar, enqueueSnackbar, open, requiresAlchemyKey]);
}
