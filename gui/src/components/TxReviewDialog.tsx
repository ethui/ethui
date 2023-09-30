import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Button, Grid, Stack, Tab, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import ReactJson from "react-json-view";
import { Address, formatEther } from "viem";

import { useDialog } from "../hooks";
import { AddressView, ContextMenu, DialogLayout, MonoText } from "./";

export interface TxRequest {
  data: string;
  from: string;
  to: string;
  value: string;
}

interface Log {
  address: Address;
  topics: string[];
}

interface Simulation {
  success: boolean;
  gasUsed: bigint;
  blockNumber: bigint;
  logs: Log[];
}

export function TxReviewDialog({ id }: { id: number }) {
  const { data, accept, reject, send, listen } = useDialog<TxRequest>(id);
  const [simulation, setSimulation] = useState<Simulation | undefined>(
    undefined,
  );
  const [tab, setTab] = useState("1");

  useEffect(() => {
    listen("simulation-result", ({ payload }: { payload: Simulation }) =>
      setSimulation(payload),
    );
  }, [listen]);

  useEffect(() => {
    send("simulate");
  }, [send]);

  if (!data) return null;

  const { from, to, value: valueStr, data: calldata } = data;
  const value = BigInt(valueStr || 0);

  return (
    <DialogLayout>
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

      <TabContext value={tab}>
        <TabList onChange={(_e: unknown, v: string) => setTab(v)}>
          <Tab label="Summary" value="1" />
          <Tab label="Simulation" value="2" />
        </TabList>

        <TabPanel value="1" sx={{ flexGrow: 1, overflowY: "auto", px: 0 }}>
          <Box sx={{}}>
            <MonoText>{calldata}</MonoText>
          </Box>
        </TabPanel>

        <TabPanel value="2" sx={{ flexGrow: 1, overflowY: "auto", px: 0 }}>
          <SimulationResult simulation={simulation} />
        </TabPanel>
      </TabContext>

      <Stack direction="row" justifyContent="center" spacing={2}>
        <Button variant="contained" color="error" onClick={() => reject()}>
          Reject
        </Button>
        <Button variant="contained" type="submit" onClick={() => accept(data)}>
          Confirm
        </Button>
      </Stack>
    </DialogLayout>
  );
}

interface SimulationResultProps {
  simulation: Simulation | undefined;
}

function SimulationResult({ simulation }: SimulationResultProps) {
  if (!simulation) return null;

  return (
    <Grid container rowSpacing={2}>
      <Datapoint label="success" value={simulation.success.toString()} short />
      <Datapoint
        label="Block Nr"
        value={simulation.blockNumber.toString()}
        short
      />
      <Datapoint label="Gas Used" value={simulation.gasUsed.toString()} />
      <Datapoint
        label="Logs"
        value={
          <ReactJson
            src={simulation.logs}
            indentWidth={2}
            displayDataTypes={false}
          />
        }
      />
    </Grid>
  );
}

interface DatapointProps {
  label: string;
  value: React.ReactNode | string;
  short: boolean;
}

function Datapoint({ label, value, short }: DatapointProps) {
  return (
    <Grid item xs={short ? 6 : 12}>
      <Typography color="gray" sx={{ fontSize: "12px" }}>
        {label}
      </Typography>
      {value}
    </Grid>
  );
}

Datapoint.defaultProps = {
  short: false,
  mono: false,
};
