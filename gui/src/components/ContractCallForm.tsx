import { AbiItemFormWithPreview } from "@ethui/form/src/AbiItemFormWithPreview";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ethui/ui/components/shadcn/accordion";
import { Button } from "@ethui/ui/components/shadcn/button";
import { type Abi, type AbiFunction, formatAbiItem } from "abitype";
import debounce from "lodash-es/debounce";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { type Address, type Hash, decodeFunctionResult } from "viem";

import { Input } from "@ethui/ui/components/shadcn/input";
import { invoke } from "@tauri-apps/api/core";
import { useInvoke } from "#/hooks/useInvoke";
import { useWallets } from "#/store/useWallets";
import { AddressView } from "./AddressView";
import { HashView } from "./HashView";

interface Props {
  chainId: number;
  address: Address;
}

type Result =
  | {
      write: Hash;
    }
  | {
      read: string;
    };

interface Option {
  item: AbiFunction | "raw";
  label: string;
  id: number;
}

const VALID_TYPES = ["function", "receive", "fallback"];
const GROUPS = ["view", "write", "fallback", "raw"];
type Group = (typeof GROUPS)[number];
type GroupedOptions = Record<Group, Option[]>;

export function ContractCallForm({ chainId, address }: Props) {
  const [filter, setFilter] = useState("");
  const { data: abi } = useInvoke<Abi>("db_get_contract_abi", {
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
              <AccordionTrigger>{label}</AccordionTrigger>
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
    </>
  );
}

interface AbiItemFormWithSubmitProps {
  item: "raw" | AbiFunction;
  address: Address;
  chainId: number;
}

function AbiItemFormWithSubmit({
  item,
  address,
  chainId,
}: AbiItemFormWithSubmitProps) {
  const [result, setResult] = useState<Result>();
  const [value, setValue] = useState<bigint | undefined>();
  const [data, setData] = useState<`0x${string}` | undefined>();
  const [loading, setLoading] = useState(false);
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
    if (item !== "raw" && item?.stateMutability === "view") {
      const rawResult = await invoke<`0x${string}`>("rpc_eth_call", { params });
      const result = decodeFunctionResult({
        abi: [item],
        functionName: item.name,
        data: rawResult,
      });

      switch (typeof result) {
        case "bigint":
          setResult({ read: (result as bigint).toString() });
          break;
        case "string":
          setResult({ read: result });
          break;
        default:
          setResult({ read: JSON.stringify(result) });
          break;
      }
    } else {
      try {
        const result = await invoke<Hash>("rpc_send_transaction", { params });
        setResult({ write: result });
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
        sender={sender}
        chainId={chainId}
        ArgProps={{
          addressRenderer: (a) => <AddressView address={a} />,
        }}
        onChange={onChange}
      />
      <form onSubmit={onSubmit}>
        <Button type="submit" disabled={loading}>
          submit
        </Button>
      </form>

      {result && "read" in result && (
        <span className="font-mono">{result.read.toString()}</span>
      )}
      {result && "write" in result && <HashView hash={result.write} />}
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

  options.raw = [{ item: "raw", label: "Raw", id: -1 }];

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
