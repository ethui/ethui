import { Grid } from "@mui/material";
import { invoke } from "@tauri-apps/api";
import { useState, useCallback } from "react";
import { type Address, type Hash, decodeFunctionResult } from "viem";

import type { AbiFunction } from "abitype";

import { AbiForm } from "@ethui/form";
import {
  SolidityCall,
  HighlightBox,
  Typography,
} from "@ethui/react/components";
import { useWallets, useNetworks } from "@/store";
import { AddressView, HashView } from "@/components";

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

  // biome-ignore lint/correctness/useExhaustiveDependencies:
  const onChange = useCallback(
    ({ value, data }: { value?: bigint; data?: `0x${string}` }) => {
      setValue(value);
      setData(data);
      parentOnChange?.({ value, data });
    },
    [setValue, setData, parentOnChange],
  );

  return (
    <Grid container>
      <Grid item xs={12} sm={4}>
        <AbiForm
          submit={submit}
          abiItem={abiItem!}
          {...{ onChange, onSubmit, defaultCalldata, defaultEther }}
        />

        {result && "read" in result && (
          <Typography mono>{result.read.toString()}</Typography>
        )}
        {result && "write" in result && <HashView hash={result.write} />}
      </Grid>

      <Grid item xs={12} sm={8} sx={{ pl: { md: 2 }, pt: { xs: 2, md: 0 } }}>
        <HighlightBox fullWidth>
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
      </Grid>
    </Grid>
  );
}
