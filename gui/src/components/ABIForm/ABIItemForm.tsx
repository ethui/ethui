import { Button, Grid, Typography } from "@mui/material";
import { Stack } from "@mui/system";
import { invoke } from "@tauri-apps/api";
import { AbiFunction } from "abitype";
import { useEffect, useState } from "react";
import { FieldValues, useForm, useWatch } from "react-hook-form";
import { Address, decodeFunctionResult, encodeFunctionData } from "viem";
import { useDebounce } from "@uidotdev/usehooks";

import { Form, SolidityCall, HighlightBox } from "@ethui/react/components";
import { ABIInput } from "./ABIInput";
import { useWallets, useNetworks } from "@/store";
import { AddressView } from "@/components";

interface CallArgs {
  value?: string;
  raw: Record<string, string>;
  parsed: Record<string, string>;
}

interface ItemFormProps {
  contract: Address;
  abiItem?: AbiFunction;
}

export function ABIItemForm({ contract, abiItem }: ItemFormProps) {
  const account = useWallets((s) => s.address);
  const chainId = useNetworks((s) => s.current?.chain_id);
  const form = useForm<CallArgs>();
  const [callResult, setCallResult] = useState<string>();
  const [txResult, setTxResult] = useState<string>();

  useEffect(() => form.reset(), [abiItem, form]);

  const watcher = useWatch({ control: form.control });
  const debouncedParams = useDebounce(watcher, 200);
  const [data, setData] = useState<`0x${string}` | undefined>();
  const [value, setValue] = useState<bigint | undefined>();

  useEffect(() => {
    const params = form.getValues();
    try {
      if (abiItem) {
        const args = abiItem.inputs.map((input, i) =>
          JSON.parse(params.parsed[input.name || i.toString()]),
        );

        const data = encodeFunctionData({
          abi: [abiItem],
          functionName: abiItem.name,
          args,
        });
        setData(data);
        setValue(BigInt(params.raw["-value-"] || 0));
      } else {
        setData((params.raw["-data-"] as `0x${string}`) || "0x");
        setValue(BigInt(params.raw["-value-"] || 0));
      }
    } catch (e) {
      setData(undefined);
      setValue(undefined);
    }
  }, [debouncedParams, abiItem, form, setData]);

  const onSubmit = async (params: FieldValues) => {
    if (abiItem?.stateMutability === "view") {
      const rawResult = await invoke<`0x${string}`>("rpc_eth_call", {
        params: {
          from: account,
          to: contract,
          value: params.value,
          data,
        },
      });

      const result = decodeFunctionResult({
        abi: [abiItem],
        functionName: abiItem.name,
        data: rawResult,
      });

      if (typeof result === "bigint") {
        // TODO: why is this cast necessary?
        setCallResult((result as bigint).toString());
      } else if (typeof result === "string") {
        setCallResult(result);
      } else {
        setCallResult(JSON.stringify(result));
      }
    } else {
      const result = await invoke<string>("rpc_send_transaction", {
        params: {
          from: account,
          to: contract,
          value: params.value,
          data,
        },
      });
      setTxResult(result);
    }
  };

  return (
    <Grid container>
      <Grid item xs={12} md={5}>
        <Form form={form} onSubmit={onSubmit}>
          <Stack direction="column" spacing={2} justifyContent="flex-start">
            {/* if calling an ABI function */}
            {abiItem && (
              <>
                {abiItem.inputs.map((item, index) => (
                  <ABIInput key={index} name={item.name || index} type={item} />
                ))}
                {abiItem.stateMutability === "payable" && (
                  <ABIInput name="-value-" label="value" type="uint256" />
                )}
                <Button
                  sx={{ minWidth: 150 }}
                  variant="contained"
                  type="submit"
                  disabled={!data || !account}
                >
                  {abiItem.stateMutability == "view" ? "Call" : "Send"}
                </Button>
              </>
            )}

            {/* if doing a raw call */}
            {!abiItem && (
              <>
                <ABIInput name="-data-" label="raw data" type="bytes" />
                <ABIInput name="-value-" label="value" type="uint256" />
                <Button
                  sx={{ minWidth: 150 }}
                  variant="contained"
                  type="submit"
                >
                  Call
                </Button>
              </>
            )}
            {callResult && <Typography>{callResult}</Typography>}
            {txResult && <Typography>{txResult}</Typography>}
          </Stack>
        </Form>
      </Grid>

      <Grid item xs={12} md={7} sx={{ pl: { md: 2 }, pt: { xs: 2, md: 0 } }}>
        <HighlightBox fullWidth>
          {data && account ? (
            <SolidityCall
              {...{
                abi: abiItem ? [abiItem] : [],
                data,
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
