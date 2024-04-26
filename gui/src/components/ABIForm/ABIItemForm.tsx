import { Grid, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api";
import { AbiFunction } from "abitype";
import { useState, useCallback } from "react";
import { Address, decodeFunctionResult } from "viem";

import { AbiForm } from "@ethui/form";
import { SolidityCall, HighlightBox } from "@ethui/react/components";
import { useWallets, useNetworks } from "@/store";
import { AddressView } from "@/components";

interface ItemFormProps {
  to: Address;
  abiItem?: AbiFunction;
  defaultCalldata?: `0x${string}`;
  defaultEther?: bigint;
}

export function ABIItemForm({
  to,
  abiItem,
  defaultCalldata,
  defaultEther,
}: ItemFormProps) {
  const from = useWallets((s) => s.address);
  const chainId = useNetworks((s) => s.current?.chain_id);
  const [result, setResult] = useState<string>();

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
          setResult((result as bigint).toString());
          break;
        case "string":
          setResult(result);
          break;
        default:
          setResult(JSON.stringify(result));
          break;
      }
    } else {
      const result = await invoke<string>("rpc_send_transaction", { params });
      setResult(result);
    }
  };

  const onChange = useCallback(
    ({ value, data }: { value?: bigint; data?: `0x${string}` }) => {
      setValue(value);
      setData(data);
    },
    [setValue, setData],
  );

  return (
    <Grid container>
      <Grid item xs={12} md={5}>
        <AbiForm
          abiItem={abiItem!}
          {...{ onChange, onSubmit, defaultCalldata, defaultEther }}
        />

        {result && <Typography>{result.toString()}</Typography>}
      </Grid>

      <Grid item xs={12} md={7} sx={{ pl: { md: 2 }, pt: { xs: 2, md: 0 } }}>
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
