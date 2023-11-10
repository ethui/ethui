import SendIcon from "@mui/icons-material/Send";
import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";

import { useTheme, useWallets } from "@/store";

import { AddressView, BalancesList, Panel } from "./";

export function Account() {
  const { theme } = useTheme();
  const address = useWallets((s) => s.address);

  if (!address) return null;

  const send = async () => {
    const result = await invoke<string>("rpc_send_transaction", {
      params: {
        from: address,
        to: "0x3C44CdDdB6a900fa2b585dd299e0312FA42d93BC",
        value: 1000000000000000000000000n,
        data: "",
      },
    });

    console.log(result);
  };

  return (
    <Panel>
      <Box
        display="flex"
        flexDirection={{ sm: "column", md: "row-reverse" }}
        alignItems="flex-start"
        justifyContent="flex-end"
        rowGap={1}
        columnGap={2}
        sx={{
          [theme.breakpoints.down("sm")]: {
            flexDirection: "column",
          },
        }}
      >
        <Button onClick={send}>
          <SendIcon></SendIcon>
        </Button>
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
        <BalancesList />
      </Box>
    </Panel>
  );
}
