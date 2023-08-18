import { ContentCopySharp } from "@mui/icons-material";
import {
  Box,
  Card,
  CardActions,
  CardContent,
  IconButton,
  Typography,
} from "@mui/material";

import { useTheme, useWallets } from "../store";
import { AddressView, BalancesList, Panel } from "./";

export function Account() {
  const { theme } = useTheme();
  const address = useWallets((s) => s.address);

  if (!address) return null;

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
