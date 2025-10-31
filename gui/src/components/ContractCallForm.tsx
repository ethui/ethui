import type { Result } from "@ethui/types";
import { AbiItemFormWithPreview } from "@ethui/ui/components/abi-form/abi-item-form-with-preview";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ethui/ui/components/shadcn/accordion";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@ethui/ui/components/shadcn/alert";
import { Button } from "@ethui/ui/components/shadcn/button";
import { Input } from "@ethui/ui/components/shadcn/input";
import { Link } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { type Abi, type AbiFunction, formatAbiItem } from "abitype";
import debounce from "lodash-es/debounce";
import { CircleCheck } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { type Address, decodeFunctionResult, type Hash } from "viem";
import { useAllAddresses } from "#/hooks/useAllAddresses";
import { useInvoke } from "#/hooks/useInvoke";
import { useWallets } from "#/store/useWallets";
import { AddressView } from "./AddressView";
import { EmptyState } from "./EmptyState";
import { HashView } from "./HashView";

interface Props {
  chainId: number;
  address: Address;
}

type WriteCall = { write: Hash };
type ReadCall = { read: string };
type CallResult = WriteCall | ReadCall;

interface Option {
  item: AbiFunction | "raw" | "rawCall";
  label: string;
  id: number;
}

const VALID_TYPES = ["function", "receive", "fallback"];
const GROUPS = ["view", "write", "fallback", "raw", "rawCall"];
type Group = (typeof GROUPS)[number];
type GroupedOptions = Record<Group, Option[]>;

export function ContractCallForm({ chainId, address }: Props) {
  const [filter, setFilter] = useState("");
  const { data: abi } = useInvoke<Abi>("db_get_contract_impl_abi", {
    address,
    chainId,
  });

  const [groupedOptions, setGroupedOptions] = useState<GroupedOptions>({});
  useEffect(
    () => setGroupedOptions(constructOptions(abi ?? [], filter)),
    [abi, filter],
  );

  return (
    <>
      <Filter onChange={(f) => setFilter(f)} />
      <Accordion type="multiple" className="w-full pt-2">
        {GROUPS.map((group) => {
          const options = groupedOptions[group];

          return options?.map(({ label, item }) => (
            <AccordionItem key={label} value={label}>
              <AccordionTrigger className="text-left">{label}</AccordionTrigger>
              <AccordionContent>
                <AbiItemFormWithSubmit
                  item={item}
                  address={address}
                  chainId={chainId}
                />
              </AccordionContent>
            </AccordionItem>
          ));
        })}
      </Accordion>

      {(!abi || abi.length === 0) && (
        <EmptyState
          message="No ABI found"
          description="Check if the contract ABI is included in the foundry path on settings"
          className="mt-8"
        >
          <Link to="/home/settings/foundry">
            <Button>Go to Settings</Button>
          </Link>
        </EmptyState>
      )}
    </>
  );
}

interface AbiItemFormWithSubmitProps {
  item: "raw" | "rawCall" | AbiFunction;
  address: Address;
  chainId: number;
}

function AbiItemFormWithSubmit({
  item,
  address,
  chainId,
}: AbiItemFormWithSubmitProps) {
  const [result, setResult] = useState<Result<CallResult, string>>();
  const [value, setValue] = useState<bigint | undefined>();
  const [data, setData] = useState<`0x${string}` | undefined>();
  const [loading, setLoading] = useState(false);
  const { data: addresses } = useAllAddresses();
  const sender = useWallets((s) => s.address);

  const onChange = useCallback(
    ({ value, data }: { value?: bigint; data?: `0x${string}` }) => {
      setValue(value);
      setData(data);
      setLoading(false);
    },
    [],
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const params = {
      value: `0x${(value || 0).toString(16)}`,
      data,
      from: sender,
      to: address,
    };
    if (
      item !== "raw" &&
      item !== "rawCall" &&
      item?.stateMutability === "view"
    ) {
      const rawResult = await invoke<`0x${string}`>("rpc_eth_call", { params });
      const result = decodeFunctionResult({
        abi: [item],
        functionName: item.name,
        data: rawResult,
      });

      switch (typeof result) {
        case "bigint":
          setResult({
            ok: true,
            value: { read: (result as bigint).toString() },
          });
          break;
        case "string":
          setResult({ ok: true, value: { read: result } });
          break;
        default:
          setResult({ ok: true, value: { read: JSON.stringify(result) } });
          break;
      }
    } else {
      try {
        if (item === "rawCall") {
          const result = await invoke<Hash>("rpc_eth_call", { params });
          setResult({ ok: true, value: { read: result } });
        } else {
          const result = await invoke<Hash>("rpc_send_transaction", { params });
          setResult({ ok: true, value: { write: result } });
        }
      } catch (_err) {
        setLoading(false);
      }
    }
    setLoading(false);
  };
  return (
    <div className="flex w-full flex-col gap-2">
      <AbiItemFormWithPreview
        abiFunction={item}
        address={address}
        addresses={addresses?.all || []}
        sender={sender}
        chainId={chainId}
        ArgProps={{
          addressRenderer: (a) => (
            <AddressView showLinkExplorer={false} address={a} />
          ),
        }}
        onChange={onChange}
      />
      <form onSubmit={onSubmit}>
        <Button type="submit" disabled={loading}>
          submit
        </Button>
      </form>

      {result?.ok && (
        <Alert className="w-full" variant="success">
          <CircleCheck className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription className="break-all">
            {"read" in result.value && result.value.read.toString()}
            {"write" in result.value && (
              <HashView
                showLinkExplorer
                truncate={false}
                hash={result.value.write}
              />
            )}
          </AlertDescription>
        </Alert>
      )}

      {result && !result.ok && (
        <Alert className="w-full" variant="destructive">
          <CircleCheck className="h-4 w-4" />
          <AlertTitle>Failed</AlertTitle>
          <AlertDescription className="break-all">
            {result.error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function Filter({ onChange }: { onChange: (f: string) => void }) {
  return (
    <form className="mx-2 flex items-stretch">
      <Input
        onChange={debounce((e) => onChange(e.target.value), 100)}
        placeholder="Filter..."
        className="h-10"
      />
    </form>
  );
}

function constructOptions(abi: Abi, filter?: string): GroupedOptions {
  const options: GroupedOptions = (abi || [])
    .filter(({ type }) => VALID_TYPES.includes(type))
    .reduce((acc, item, id) => {
      const abiItem = item as AbiFunction;
      const group = groupFor(abiItem);
      const label = formatAbiItem(abiItem).replace("function ", "");
      if (filter && label.toLowerCase().indexOf(filter.toLowerCase()) === -1) {
        return acc;
      }
      acc[group] ||= [];
      acc[group].push({
        item: abiItem,
        label,
        id,
      });
      return acc;
    }, {} as GroupedOptions);

  options.raw = [{ item: "raw", label: "Raw Transaction", id: -1 }];
  options.rawCall = [{ item: "rawCall", label: "Raw Call", id: -2 }];

  return options;
}

function groupFor(item: AbiFunction) {
  if (item.stateMutability === "view") {
    return "view";
  } else if (["fallback", "receive"].includes(item.type)) {
    return "fallback";
  } else {
    return "write";
  }
}
