import { Box, Divider, Stack } from "@mui/material";

import { useAccount } from "../hooks";
import { AddressView } from "./AddressView";
import { Balances } from "./Balances";

export function Details() {
  const address = useAccount();

  if (!address) return null;

  return (
    <Stack direction="column" justifyContent="center" spacing={1}>
      <Box alignSelf="center">
        <AddressView address={address} />
      </Box>
      <Divider />
      <Balances />
    </Stack>
  );
}
