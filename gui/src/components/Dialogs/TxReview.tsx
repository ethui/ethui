import { Alert, AlertTitle, Button, Grid, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import JsonView from "react18-json-view";
import { Abi, Address, Hex, decodeEventLog, parseAbi } from "viem";

import { SolidityCall } from "@iron/react/components";
import { AddressView, Datapoint } from "@/components";
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
  data: Hex;
  topics: [signature: Hex, ...args: Hex[]];
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

      <SimulationResult simulation={simulation} />

      <Actions
        request={request}
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
    <>
      <Stack direction="column" spacing={1}>
        {simulation.logs.map((log, i) => (
          <Log key={i} log={log} />
        ))}
      </Stack>

      <Grid container rowSpacing={1}>
        <Datapoint
          label="success"
          value={simulation.success.toString()}
          short
        />
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
    </>
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

interface LogProps {
  log: Log;
}

const erc20Transfer = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

function Log({ log }: LogProps) {
  const [type, decoded] = decodeKnownLog(log);

  switch (type) {
    case "erc20transfer":
      return (
        <Stack direction="row" spacing={2}>
          From&nbsp;
          <AddressView address={decoded.args.from} />
          &nbsp; To <AddressView address={decoded.args.to} />
          For {decoded.args.value.toString()}
          <AddressView address={log.address} />
        </Stack>
      );
  }

  return null;
}

function decodeKnownLog(log: Log) {
  try {
    return [
      "erc20transfer",
      decodeEventLog({
        abi: erc20Transfer,
        data: log.data,
        topics: log.topics,
      }),
    ];
  } catch (e) {
    return null;
  }
}
