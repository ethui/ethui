import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Alert, AlertTitle, Button, Grid, Stack, Tab } from "@mui/material";
import { useEffect, useState } from "react";
import JsonView from "react18-json-view";
import { Abi, Address } from "viem";
import { Delete, Send } from "@mui/icons-material";

import { SolidityCall } from "@iron/react/components";
import { AddressView, CalldataView, Datapoint } from "@/components";
import { useDialog, useInvoke, useLedgerDetect } from "@/hooks";
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
  const { data: request, send, listen } = useDialog<TxRequest>(id);
  const [simulation, setSimulation] = useState<Simulation | undefined>(
    undefined,
  );
  const [accepted, setAccepted] = useState(false);
  const [tab, setTab] = useState("1");

  const { data: abi } = useInvoke<Abi>("get_contract_abi", {
    address: request?.to,
    chainId: request?.chainId,
  });

  useEffect(() => {
    listen("simulation-result", ({ payload }: { payload: Simulation }) =>
      setSimulation(payload),
    );
  }, [listen]);

  useEffect(() => {
    send("simulate");
  }, [send]);

  if (!request) return null;

  const onReject = () => {
    send("reject");
  };

  const onConfirm = () => {
    send("accept");
    setAccepted(true);
  };

  const { from, to, value: valueStr, data, chainId } = request;
  const value = BigInt(valueStr || 0);

  return (
    <DialogLayout>
      <Stack spacing={2} alignItems="center">
        <SolidityCall
          {...{ value, data, from, to, chainId, abi }}
          ArgProps={{ addressRenderer: (a) => <AddressView address={a} /> }}
        />
      </Stack>

      <TabContext value={tab}>
        <TabList onChange={(_e: unknown, v: string) => setTab(v)}>
          <Tab label="Summary" value="1" />
          <Tab label="Simulation" value="2" />
        </TabList>

        <TabPanel value="1" sx={{ flexGrow: 1, overflowY: "auto", px: 0 }}>
          <CalldataView data={data} contract={to} chainId={chainId} />
        </TabPanel>

        <TabPanel value="2" sx={{ flexGrow: 1, overflowY: "auto", px: 0 }}>
          <SimulationResult simulation={simulation} />
        </TabPanel>
      </TabContext>

      <DialogLayout.Bottom>
        <Actions
          request={request}
          onReject={onReject}
          onConfirm={onConfirm}
          accepted={accepted}
        />
      </DialogLayout.Bottom>
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
  request: TxRequest;
  onReject: () => void;
  onConfirm: () => void;
  accepted: boolean;
}

function Actions({ request, accepted, onReject, onConfirm }: ActionsProps) {
  const ledgerDetected = useLedgerDetect({
    disabled: request?.walletType !== "ledger",
    stopOnDetected: true,
  });

  if (request.walletType === "ledger" && !ledgerDetected) {
    return (
      <Alert severity="info">
        <AlertTitle>Ledger not detected</AlertTitle>
        Please unlock your Ledger, and open the Ethereum app
      </Alert>
    );
  } else if (request.walletType === "ledger" && ledgerDetected && accepted) {
    return (
      <Alert severity="info">
        <AlertTitle>Check your ledger</AlertTitle>
        You need to confirm your transaction in your physical device
      </Alert>
    );
  } else {
    return (
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={2}
      >
        <Button
          size="large"
          variant="outlined"
          color="error"
          onClick={onReject}
          startIcon={<Delete />}
        >
          Reject
        </Button>
        <Button
          size="large"
          variant="contained"
          color="primary"
          type="submit"
          onClick={onConfirm}
          endIcon={<Send />}
        >
          Confirm
        </Button>
      </Stack>
    );
  }
}
