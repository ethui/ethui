import { Grid, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api";
import { AbiFunction } from "abitype";
import { useState } from "react";
import { Address, decodeFunctionResult } from "viem";

import { AbiForm } from "@ethui/form";
import { SolidityCall, HighlightBox } from "@ethui/react/components";
import { useWallets, useNetworks } from "@/store";
import { AddressView } from "@/components";

interface ItemFormProps {
  contract: Address;
  abiItem?: AbiFunction;
}

export function ABIItemForm({ contract, abiItem }: ItemFormProps) {
  const account = useWallets((s) => s.address);
  const chainId = useNetworks((s) => s.current?.chain_id);
  const [result, setResult] = useState<string>();

  const [value, setValue] = useState<bigint | undefined>();
  const [calldata, setCalldata] = useState<`0x${string}` | undefined>();

  const onSubmit = async () => {
    if (abiItem?.stateMutability === "view") {
      const rawResult = await invoke<`0x${string}`>("rpc_eth_call", {
        params: {
          from: account,
          to: contract,
          value: `0x${(value || 0n).toString(16)}`,
          data: calldata,
        },
      });

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
      const result = await invoke<string>("rpc_send_transaction", {
        params: {
          from: account,
          to: contract,
          value: `0x${(value || 0n).toString(16)}`,
          data: calldata,
        },
      });
      setResult(result);
    }
  };

  return (
    <Grid container>
      <Grid item xs={12} md={5}>
        <AbiForm
          abiItem={abiItem!}
          onCalldataChange={setCalldata}
          onValueChange={setValue}
          onSubmit={onSubmit}
        />

        {result && <Typography>{result.toString()}</Typography>}
      </Grid>

      <Grid item xs={12} md={7} sx={{ pl: { md: 2 }, pt: { xs: 2, md: 0 } }}>
        <HighlightBox fullWidth>
          {calldata && account ? (
            <SolidityCall
              {...{
                abi: abiItem ? [abiItem] : [],
                data: calldata,
                value,
                chainId,
                from: account,
                to: contract,
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
