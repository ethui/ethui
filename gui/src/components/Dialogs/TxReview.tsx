import { TabContext, TabList, TabPanel } from "@mui/lab";
import {
  Alert,
  AlertTitle,
  Button,
  Grid,
  Stack,
  Tab,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import JsonView from "react18-json-view";
import { Address, formatEther } from "viem";

import {
  AddressView,
  CalldataView,
  ContextMenu,
  Datapoint,
} from "@/components";
import { useDialog, useLedgerDetect } from "@/hooks";
import { DialogLayout } from "./Layout";

export interface TxRequest {
  data: `0x${string}`;
  from: Address;
  to: Address;
  value: string;
  chainId: number;
  walletType:
    | "ledger"
    | "HdWallet"
    | "jsonKeystore"
    | "plaintext"
    | "impersonator";
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
  const { data, send, listen } = useDialog<TxRequest>(id);
  const [simulation, setSimulation] = useState<Simulation | undefined>(
    undefined,
  );
  const [accepted, setAccepted] = useState(false);
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

  const onReject = () => {
    send("reject");
  };

  const onConfirm = () => {
    send("accept");
    setAccepted(true);
  };

  const { from, to, value: valueStr, data: calldata, chainId } = data;
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
          <CalldataView data={calldata} contract={to} chainId={chainId} />
        </TabPanel>

        <TabPanel value="2" sx={{ flexGrow: 1, overflowY: "auto", px: 0 }}>
          <SimulationResult simulation={simulation} />
        </TabPanel>
      </TabContext>

      <Actions
        data={data}
        onReject={onReject}
        onConfirm={onConfirm}
        accepted={accepted}
      />
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
        value={<JsonView src={simulation.logs} theme="default" />}
      />
    </Grid>
  );
}

interface ActionsProps {
  data: TxRequest;
  onReject: () => void;
  onConfirm: () => void;
  accepted: boolean;
}

function Actions({ data, accepted, onReject, onConfirm }: ActionsProps) {
  const ledgerDetected = useLedgerDetect({
    disabled: data?.walletType !== "ledger",
    stopOnDetected: true,
  });

  if (data.walletType === "ledger" && !ledgerDetected) {
    return (
      <Alert severity="info">
        <AlertTitle>Ledger not detected</AlertTitle>
        Please unlock your Ledger, and open the Ethereum app
      </Alert>
    );
  } else if (data.walletType === "ledger" && ledgerDetected && accepted) {
    return (
      <Alert severity="info">
        <AlertTitle>Check your ledger</AlertTitle>
        You need to confirm your transaction in your physical device
      </Alert>
    );
  } else {
    return (
      <Stack direction="row" justifyContent="center" spacing={2}>
        <Button variant="contained" color="error" onClick={onReject}>
          Reject
        </Button>
        <Button variant="contained" type="submit" onClick={onConfirm}>
          Confirm
        </Button>
      </Stack>
    );
  }
}
