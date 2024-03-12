import { Alert, AlertTitle, Box, Button, Grid, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import { Cancel, CheckCircle, Delete, Send, Report } from "@mui/icons-material";
import { Abi, Address, Hex, decodeEventLog, formatUnits, parseAbi } from "viem";
import { createLazyFileRoute } from "@tanstack/react-router";

import { ChainView, SolidityCall, Typography } from "@iron/react/components";
import { TokenMetadata } from "@iron/types";
import { Network } from "@iron/types/network";
import { AddressView, Datapoint } from "@/components";
import { useDialog, useInvoke, useLedgerDetect } from "@/hooks";
import { DialogBottom } from "@/components/Dialogs/Bottom";
import { IconCrypto } from "@/components/Icons";
import { useNetworks } from "@/store";

export const Route = createLazyFileRoute("/_dialog/dialog/tx-review/$id")({
  component: TxReviewDialog,
});

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
  pastInteractions: number;
  success: boolean;
  gasUsed: bigint;
  blockNumber: bigint;
  logs: Log[];
}

export function TxReviewDialog() {
  const { id } = Route.useParams();
  const { data: request, send, listen } = useDialog<TxRequest>(id);
  const [simulation, setSimulation] = useState<Simulation | undefined>(
    undefined,
  );
  const [accepted, setAccepted] = useState(false);
  const network = useNetworks((s) =>
    s.networks.find((n) => n.chain_id == request?.chainId),
  );

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

  if (!request || !network) return null;

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
    <>
      <Header {...{ from, to, network }} />

      <SolidityCall
        {...{ value, data, from, to, chainId, abi }}
        ArgProps={{ addressRenderer: (a) => <AddressView address={a} /> }}
        sx={{ width: "100%" }}
      />

      <SimulationResult simulation={simulation} chainId={chainId} to={to} />

      <DialogBottom>
        <Actions
          request={request}
          onReject={onReject}
          onConfirm={onConfirm}
          accepted={accepted}
        />
      </DialogBottom>
    </>
  );
}

interface HeaderProps {
  from: Address;
  to: Address;
  network: Network;
}

function Header({ from, to, network }: HeaderProps) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="stretch"
      alignSelf="center"
      width="100%"
    >
      <Typography variant="h6" component="h1">
        <Stack direction="row" alignItems="center" spacing={1}>
          <AddressView address={from} />
          <span>→</span>
          <AddressView address={to} />
        </Stack>
      </Typography>
      <Box ml={5}>
        <ChainView name={network.name} chainId={network.chain_id} />
      </Box>
    </Stack>
  );
}

interface SimulationResultProps {
  simulation: Simulation | undefined;
  chainId: number;
  to: Address;
}

function SimulationResult({ simulation, chainId, to }: SimulationResultProps) {
  const { data: callCount } = useInvoke<number>("simulator_get_call_count", {
    chainId,
    to,
  });

  if (!simulation) return null;

  return (
    <Grid container rowSpacing={1}>
      <Datapoint
        label="Trust"
        value={
          callCount &&
          (callCount > 0 ? (
            <Stack direction="row">
              <CheckCircle color="success" />
              <Typography>Called {callCount} time(s) before.</Typography>
            </Stack>
          ) : (
            <Stack direction="row">
              <Report color="error" />
              <Typography>First interaction with this contract.</Typography>
            </Stack>
          ))
        }
        size="large"
      />
      <Datapoint
        label="Status"
        value={
          simulation.success ? (
            <CheckCircle color="success" />
          ) : (
            <Cancel color="error" />
          )
        }
        size="medium"
      />
      {simulation.success && (
        <Datapoint
          label="Expected Gas Usage"
          value={simulation.gasUsed.toString()}
          size="medium"
        />
      )}
      <Grid item xs={12}>
        {simulation.logs.map((log, i) => (
          <Log key={i} log={log} chainId={chainId} />
        ))}
      </Grid>
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

interface LogProps {
  log: Log;
  chainId: number;
}

const erc20Transfer = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

function Log({ log, chainId }: LogProps) {
  const result = decodeKnownLog(log);
  if (!result) return null;
  const [type, decoded] = result;

  switch (type) {
    case null:
      return null;
    case "erc20transfer":
      return (
        <Erc20Transfer
          from={decoded.args.from}
          to={decoded.args.to}
          value={decoded.args.value}
          contract={log.address}
          chainId={chainId}
        />
      );
  }
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
    ] as const;
  } catch (e) {
    return null;
  }
}

interface Erc20TransferProps {
  chainId: number;
  from: Address;
  to: Address;
  value: bigint;
  contract: Address;
}

function Erc20Transfer({
  chainId,
  from,
  to,
  value,
  contract,
}: Erc20TransferProps) {
  const { data: metadata } = useInvoke<TokenMetadata>("db_get_erc20_metadata", {
    chainId,
    contract,
  });

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <AddressView address={from} />
      <span>→</span>
      <AddressView address={to} />
      <IconCrypto chainId={chainId} address={contract} />
      {metadata?.decimals
        ? formatUnits(value, metadata.decimals)
        : value.toString()}{" "}
      {metadata?.symbol && `${metadata.symbol}`}
    </Stack>
  );
}
