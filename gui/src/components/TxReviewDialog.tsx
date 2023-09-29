import { Button, Stack, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useState } from "react";
import { formatEther } from "viem";

import { useDialog } from "../hooks";
import { AddressView, ContextMenu, MonoText } from "./";

export interface TxRequest {
  data: string;
  from: string;
  to: string;
  value: string;
}

export function TxReviewDialog({ id }: { id: number }) {
  const { data, accept, reject, send, listen } = useDialog<TxRequest>(id);
  const [simulation, setSimulation] = useState<unknown>({});

  useEffect(() => {
    listen("simulation-result", ({ payload }) => setSimulation(payload));
  }, [listen]);

  useEffect(() => {
    send("simulate");
  }, []);

  if (!data) return null;

  console.log("sim", simulation);

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
      <MonoText>{calldata}</MonoText>

      <MonoText>{JSON.stringify(simulation, null, 2)}</MonoText>

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
