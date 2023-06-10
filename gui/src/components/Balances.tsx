import { Box, Divider, Stack } from "@mui/material";

import { useAccount } from "../hooks";
import { AddressView } from "./AddressView";
import { BalancesList } from "./BalancesList";

export function Balances() {
  const address = useAccount();

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
