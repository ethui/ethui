import { List, Stack, IconButton, CardHeader, Box } from "@mui/material";
import { AddressView } from "..";
import { IconAddress } from "../Icons";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import { type Address } from "viem";
import { invoke } from "@tauri-apps/api";
import { useDenylist, useNetworks } from "@/store";

export function SettingsDenylist() {
  const currentNetwork = useNetworks((s) => s.current);
  const denylist = useDenylist((s) => s.erc20Denylist);

  if (!currentNetwork) return null;

  const allowlist = (contract: Address) => {
    invoke("db_set_erc20_allowlist", {
      chainId: currentNetwork.chain_id,
      address: contract,
    });
  };

  return (
    <List sx={{ maxWidth: 350 }}>
      <>
        {denylist.map(({ contract, metadata }) => (
          <CardHeader
          sx={{ marginTop: -2 }}
          avatar={<IconAddress chainId={currentNetwork.chain_id} address={contract} />}
          action={
            <Stack direction="row" justifyContent="center">
              <IconButton title={"Unhide token"} onClick={() => allowlist(contract)}>
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
      </>
    </List>
  );
}
