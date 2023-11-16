import SendIcon from "@mui/icons-material/Send";
import {
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";

import { useWallets } from "@/store";

import { AddressView, BalancesList, Modal, Panel, TransferForm } from "./";

export function Account() {
  const address = useWallets((s) => s.address);
  const [transferFormOpen, setTransferFormOpen] = useState(false);

  if (!address) return null;

  return (
    <>
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
            <Card>
              <CardContent>
                <Typography
                  textTransform="uppercase"
                  fontSize={12}
                  color="text.secondary"
                >
                  Transfer
                </Typography>
                <CardActionArea
                  onClick={() => setTransferFormOpen(true)}
                  sx={{ textAlign: "center" }}
                >
                  <SendIcon />
                </CardActionArea>
              </CardContent>
            </Card>
          </Stack>
          <BalancesList />
        </Stack>
      </Panel>
      <Modal open={transferFormOpen} onClose={() => setTransferFormOpen(false)}>
        <TransferForm onClose={() => setTransferFormOpen(false)} />
      </Modal>
    </>
  );
}
