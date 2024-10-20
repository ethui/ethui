import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Box, CardHeader, IconButton, List, Stack } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import type { Address } from "viem";

import { IconAddress } from "#/components/Icons/Address";
import { useBlacklist } from "#/store/useBlacklist";
import { useNetworks } from "#/store/useNetworks";
import { AddressView } from "../AddressView";

export function SettingsTokens() {
  const currentNetwork = useNetworks((s) => s.current);
  const blacklist = useBlacklist((s) => s.erc20Blacklist);

  if (!currentNetwork) return null;

  const unhide = (contract: Address) => {
    invoke("db_clear_erc20_blacklist", {
      chainId: currentNetwork.chain_id,
      address: contract,
    });
  };

  return (
    <List sx={{ maxWidth: 350 }}>
      {blacklist.map(({ contract, metadata }) => (
        <CardHeader
          key={contract}
          sx={{ marginTop: -2 }}
          avatar={
            <IconAddress chainId={currentNetwork.chain_id} address={contract} />
          }
          action={
            <Stack direction="row" justifyContent="center">
              <IconButton
                title={"Unhide token"}
                onClick={() => unhide(contract)}
              >
                <VisibilityOffIcon />
              </IconButton>
            </Stack>
          }
          title={
            <>
              <Box component="span" sx={{ mr: 1 }}>
                {metadata?.symbol}
              </Box>
              {contract && (
                <>
                  (<AddressView address={contract} />)
                </>
              )}
            </>
          }
        />
      ))}
    </List>
  );
}
