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
import { ContentCopySharp } from "@mui/icons-material";

export function Balances() {
  const { theme } = useTheme();
  const address = useWallets((s) => s.address);

  if (!address) return null;

  return (
    <Panel>
      <Box
        display="flex"
        flexDirection="row-reverse"
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
              Account
            </Typography>
            <Typography>
              <AddressView address={address} />
            </Typography>
          </CardContent>
          <CardActions disableSpacing>
            <IconButton>
              <ContentCopySharp fontSize="small" />
            </IconButton>
          </CardActions>
        </Card>
        <BalancesList />
      </Box>
    </Panel>
  );
}
