import { invoke } from "@tauri-apps/api/core";
import type { AbiFunction } from "abitype";
import { useCallback, useState } from "react";
import { type Address, type Hash, decodeFunctionResult } from "viem";

import { AbiForm } from "@ethui/form/src/AbiForm";
import { HighlightBox } from "@ethui/ui/components/highlight-box";
import { SolidityCall } from "@ethui/ui/components/solidity-call";

import { AddressView } from "#/components/AddressView";
import { HashView } from "#/components/HashView";
import { useNetworks } from "#/store/useNetworks";
import { useWallets } from "#/store/useWallets";

interface ItemFormProps {
  to: Address;
  abiItem?: AbiFunction;
  defaultCalldata?: `0x${string}`;
  defaultEther?: bigint;
  onChange?: (params: { value?: bigint; data?: `0x${string}` }) => void;
  submit?: boolean;
}

type Result =
  | {
    write: Hash;
  }
  | {
    read: string;
  };

export function ABIItemForm({
  to,
  abiItem,
  defaultCalldata,
  defaultEther,
  submit = true,
  onChange: parentOnChange,
}: ItemFormProps) {
  const from = useWallets((s) => s.address);
  const chainId = useNetworks((s) => s.current?.chain_id);
  const [result, setResult] = useState<Result>();

  const [value, setValue] = useState<bigint | undefined>();
  const [data, setData] = useState<`0x${string}` | undefined>();

  const onSubmit = async () => {
    const params = { value: `0x${(value || 0).toString(16)}`, data, from, to };
    if (abiItem?.stateMutability === "view") {
      const rawResult = await invoke<`0x${string}`>("rpc_eth_call", { params });
      const result = decodeFunctionResult({
        abi: [abiItem],
        functionName: abiItem.name,
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
      const result = await invoke<Hash>("rpc_send_transaction", { params });
      setResult({ write: result });
    }
  };

  const onChange = useCallback(
    ({ value, data }: { value?: bigint; data?: `0x${string}` }) => {
      setValue(value);
      setData(data);
      parentOnChange?.({ value, data });
    },
    [parentOnChange],
  );

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="col-span-3 md:col-span-1">
        <AbiForm
          submit={submit}
          abiItem={abiItem!}
          {...{ onChange, onSubmit, defaultCalldata, defaultEther }}
        />

        {result && "read" in result && (
          <span className="font-mono">{result.read.toString()}</span>
        )}
        {result && "write" in result && <HashView hash={result.write} />}
      </div>

      <div className="col-span-3 md:col-span-2">
        <HighlightBox className="w-full">
          {data && from ? (
            <SolidityCall
              {...{
                value,
                data,
                from,
                to,
                abi: abiItem ? [abiItem] : [],
                chainId,
              }}
              ArgProps={{ addressRenderer: (a) => <AddressView address={a} /> }}
            />
          ) : (
            "Preview not ready. Fill in the form"
          )}
        </HighlightBox>
      </div>
    </div>
  );
}
