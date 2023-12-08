import { Card, CardContent, Stack, Typography } from "@mui/material";

import { useWallets } from "@/store";

import { AddressView, Balances, Nfts, Panel } from "./";

export function Account() {
  const address = useWallets((s) => s.address);

  if (!address) return null;

  return (
    <Panel>
      <Stack direction="column" spacing={2}>
        <Stack
          direction="row"
          alignItems="stretch"
          justifyContent="space-between"
          spacing={2}
        >
          <Card sx={{ width: "fit-content" }}>
            <CardContent sx={{ pb: 0 }}>
              <Typography
                textTransform="uppercase"
                fontSize={12}
                color="text.secondary"
              >
                Address
              </Typography>
              <Typography>
                <AddressView address={address} copyIcon />
              </Typography>
            </CardContent>
          </Card>
        </Stack>

        <Typography variant="h6" component="h2">
          Tokens
        </Typography>
        <Balances />

        <Typography variant="h6" component="h2">
          NFTs
        </Typography>
        <Nfts />
      </Stack>
    </Panel>
  );
}
