import { AbiItemFormWithPreview } from "@ethui/form/src/AbiItemFormWithPreview";
import { AbiItemSelect } from "@ethui/form/src/AbiItemSelect";
import { Button } from "@ethui/ui/components/shadcn/button";
import type { Abi, AbiFunction } from "abitype";
import { type FormEvent, useCallback, useState } from "react";
import { type Address, type Hash, decodeFunctionResult } from "viem";

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

export function ContractCallForm({ chainId, address }: Props) {
  const [abiItem, setAbiItem] = useState<AbiFunction | "raw" | undefined>();
  const sender = useWallets((s) => s.address);
  const [result, setResult] = useState<Result>();
  const [value, setValue] = useState<bigint | undefined>();
  const [data, setData] = useState<`0x${string}` | undefined>();
  const { data: abi } = useInvoke<Abi>("db_get_contract_abi", {
    address,
    chainId,
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const params = {
      value: `0x${(value || 0).toString(16)}`,
      data,
      from: sender,
      to: address,
    };
    if (abiItem !== "raw" && abiItem?.stateMutability === "view") {
      console.log(params);
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
    },
    [],
  );

  return (
    <>
      <AbiItemSelect abi={abi ?? []} onChange={setAbiItem} />
      {abiItem && (
        <>
          <AbiItemFormWithPreview
            key={JSON.stringify(abiItem)}
            abiFunction={abiItem}
            address={address}
            sender={sender}
            chainId={chainId}
            ArgProps={{ addressRenderer: (a) => <AddressView address={a} /> }}
            onChange={onChange}
          />
          <form onSubmit={onSubmit}>
            <Button type="submit">submit</Button>
          </form>

          {result && "read" in result && (
            <span className="font-mono">{result.read.toString()}</span>
          )}
          {result && "write" in result && <HashView hash={result.write} />}
        </>
      )}
    </>
  );
}
