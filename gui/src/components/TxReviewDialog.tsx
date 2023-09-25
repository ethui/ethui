import { ExpandMore } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { formatEther } from "viem";

import { useDialog } from "../hooks";
import { AddressView, ContextMenu } from "./";

export interface TxRequest {
  data: string;
  from: string;
  to: string;
  value: string;
}

export function TxReviewDialog({ id }: { id: number }) {
  const { data, accept, reject } = useDialog<TxRequest>(id);

  if (!data) return null;

  const { from, to, value: valueStr, data: calldata } = data;
  const value = BigInt(valueStr || 0);

  return (
    <Stack direction="column" spacing={2} sx={{ p: 2 }}>
      <Typography variant="h6" component="h1">
        Transaction review
      </Typography>
      <Stack direction="row" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1}>
          <AddressView address={from} /> <span>→</span>{" "}
          <AddressView address={to} />
        </Stack>
        <ContextMenu>{formatEther(BigInt(value))} Ξ</ContextMenu>
      </Stack>
      <Typography>data: {calldata}</Typography>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>Customize Gas</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField label="Gas" fullWidth></TextField>
          <Stack
            direction="row"
            justifyContent="center"
            spacing={2}
            marginTop={2}
          >
            <Button>Default Value</Button>
            <Button>Set Gas</Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Stack direction="row" justifyContent="center" spacing={2}>
        <Button variant="contained" color="error" onClick={() => reject()}>
          Cancel
        </Button>
        <Button variant="contained" type="submit" onClick={() => accept(data)}>
          Submit
        </Button>
      </Stack>
    </Stack>
  );
}
