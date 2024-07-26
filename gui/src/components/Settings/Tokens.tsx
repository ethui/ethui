import { List, Stack, IconButton, CardHeader, Box } from "@mui/material";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { type Address } from "viem";
import { invoke } from "@tauri-apps/api";

import { AddressView } from "..";
import { IconAddress } from "@/components/Icons";
import { useBlacklist, useNetworks } from "@/store";

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
      <>
        {blacklist.map(({ contract, metadata }) => (
          <CardHeader
            key={contract}
            sx={{ marginTop: -2 }}
            avatar={
              <IconAddress
                chainId={currentNetwork.chain_id}
                address={contract}
              />
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
      </>
    </List>
  );
}
