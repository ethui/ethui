import { Box, Divider, Stack } from "@mui/material";

import { useWallets } from "../store";
import { AddressView } from "./AddressView";
import { BalancesList } from "./BalancesList";

export function Balances() {
  const address = useWallets((s) => s.address);

  if (!address) return null;

  return (
    <Stack direction="column" justifyContent="center" spacing={1}>
      <Box alignSelf="center">
        <AddressView address={address} />
      </Box>
      <Divider />
      <BalancesList />
    </Stack>
  );
}
