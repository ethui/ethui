import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@ethui/ui/components/shadcn/alert";
import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  type Abi,
  type AbiFunction,
  type Address,
  type Hex,
  decodeEventLog,
  formatUnits,
  getAbiItem,
  parseAbi,
} from "viem";

import { ChainView } from "@ethui/ui/components/chain-view";

import type { TokenMetadata } from "@ethui/types";
import type { Network } from "@ethui/types/network";
import { Check, CheckIcon, FilePlus2, X } from "lucide-react";
import { AddressView } from "#/components/AddressView";
import { Datapoint } from "#/components/Datapoint";
import { DialogBottom } from "#/components/Dialogs/Bottom";
import { IconAddress } from "#/components/Icons/Address";
import { useDialog } from "#/hooks/useDialog";
import type { Dialog } from "#/hooks/useDialog";
import { useInvoke } from "#/hooks/useInvoke";
import { useLedgerDetect } from "#/hooks/useLedgerDetect";
import { useNetworks } from "#/store/useNetworks";
import { AbiItemFormWithPreview } from "@ethui/form/src/AbiItemFormWithPreview";

export const Route = createFileRoute("/_dialog/dialog/tx-review/$id")({
  component: TxReviewDialog,
});

export interface TxRequest {
  input: `0x${string}`;
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
  const dialog = useDialog<TxRequest>(id);
  const network = useNetworks((s) =>
    s.networks.find((n) => n.chain_id === dialog.data?.chainId),
  );

  if (!dialog.data || !network) return null;

  return <Inner {...{ dialog, request: dialog.data, network }} />;
}

interface InnerProps {
  dialog: Dialog<TxRequest>;
  request: TxRequest;
  network: Network;
}

function Inner({ dialog, request, network }: InnerProps) {
  const { send, listen } = dialog;
  const { from, to, chainId, input: data, value: valueStr } = request;

  const [simulation, setSimulation] = useState<Simulation | undefined>(
    undefined,
  );
  const [accepted, setAccepted] = useState(false);
  const [calldata, setCalldata] = useState<`0x${string}` | undefined>(data);
  const [value, setValue] = useState<bigint>(BigInt(valueStr || 0));

  const { data: abi } = useInvoke<Abi>("db_get_contract_abi", {
    address: request?.to,
    chainId: request?.chainId,
  });

  useEffect(() => {
    listen<Simulation>("simulation-result", ({ payload }) => {
      setSimulation(payload);
    });
  }, [listen]);

  useEffect(() => {
    send({ event: "simulate" });
  }, [send]);

  const onReject = () => {
    send({ event: "reject" });
  };

  const onConfirm = () => {
    send({ event: "accept" });
    setAccepted(true);
  };

  const onChange = useCallback(
    ({ value, data }: { value?: bigint; data?: `0x${string}` }) => {
      setValue(value || 0n);
      setCalldata(data);
      send({ event: "update", value, data });
    },
    [send],
  );

  const item = abi
    ? (getAbiItem({ abi, name: data.slice(0, 10) }) as AbiFunction)
    : undefined;

  return (
    <>
      <Header {...{ from, to, network }} />

      {item && (
        <AbiItemFormWithPreview
          abiFunction={item}
          address={to}
          sender={from}
          chainId={chainId}
          ArgProps={{ addressRenderer: (a) => <AddressView address={a} /> }}
          onChange={onChange}
          defaultCalldata={calldata}
          defaultEther={value}
        />
      )}

      <div className="my-4">
        <SimulationResult simulation={simulation} chainId={chainId} to={to} />
      </div>

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
    <div className=" flex w-full items-stretch justify-between self-center">
      <h1 className="font-xl">
        <div className="m-2 flex items-center gap-2">
          <AddressView address={from} />
          <span>→</span>
          <AddressView address={to} />
        </div>
      </h1>
      <div className="ml-5">
        <ChainView name={network.name} chainId={network.chain_id} />
      </div>
    </div>
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
    <div className="grid grid-cols-4 gap-5">
      <Datapoint
        label="Trust"
        value={
          callCount && callCount > 0 ? (
            <div className="flex">
              <Check />
              <span>Called {callCount} time(s) before.</span>
            </div>
          ) : (
            <div className="flex">
              <FilePlus2 />
              <span>First interaction.</span>
            </div>
          )
        }
        className="col-span-2"
      />
      <Datapoint
        label="Status"
        value={simulation.success ? <Check /> : <X />}
      />
      {simulation.success && (
        <Datapoint label="Gas Used" value={simulation.gasUsed.toString()} />
      )}
      <div className="col-span-4">
        {simulation.logs.map((log, i) => (
          <Log key={i} log={log} chainId={chainId} />
        ))}
      </div>
    </div>
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
      <Alert>
        <AlertTitle>Ledger not detected</AlertTitle>
        <AlertDescription>
          Please unlock your Ledger, and open the Ethereum app
        </AlertDescription>
      </Alert>
    );
  } else if (request.walletType === "ledger" && ledgerDetected && accepted) {
    return (
      <Alert>
        <AlertTitle>Check your ledger</AlertTitle>
        <AlertDescription>
          You need to confirm your transaction in your physical device
        </AlertDescription>
      </Alert>
    );
  } else {
    return (
      <div className="m-2 flex items-center justify-center gap-2">
        <Button variant="destructive" onClick={onReject}>
          <X />
          Reject
        </Button>
        <Button type="submit" onClick={onConfirm}>
          <CheckIcon />
          Confirm
        </Button>
      </div>
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
    <div className=" m-1 flex items-center">
      <AddressView address={from} />
      <span>→</span>
      <AddressView address={to} />
      <IconAddress chainId={chainId} address={contract} />
      {metadata?.decimals
        ? formatUnits(value, metadata.decimals)
        : value.toString()}{" "}
      {metadata?.symbol && `${metadata.symbol}`}
    </div>
  );
}
