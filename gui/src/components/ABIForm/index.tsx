import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import { Stack } from "@mui/system";
import { invoke } from "@tauri-apps/api";
import { Abi, AbiFunction, formatAbiItem } from "abitype";
import { SyntheticEvent, useEffect, useState } from "react";
import { useWatch } from "react-hook-form";
import { FieldValues, useForm } from "react-hook-form";
import { Address, decodeFunctionResult, encodeFunctionData } from "viem";
import { useDebounce } from "@uidotdev/usehooks";

import { SolidityCall, HighlightBox } from "@ethui/react/components";
import { ABIInput } from "./ABIInput";
import { useInvoke } from "@/hooks";
import { useWallets, useNetworks } from "@/store";
import { AddressView } from "@/components";
import { Form } from "@ethui/react/components";

interface Props {
  chainId: number;
  address: Address;
}

export function ABIForm({ chainId, address }: Props) {
  const [currentItem, setCurrentItem] = useState<AbiFunction | undefined>();

  const { data: abi } = useInvoke<Abi>("db_get_contract_abi", {
    address,
    chainId,
  });

  if (!abi) return null;

  const options = abi
    .filter(({ type }) => type === "function")
    .map((item, i) => {
      item = item as AbiFunction;
      return {
        item,
        label: formatAbiItem(item).replace("function ", ""),
        group: item.stateMutability === "view" ? "view" : "write",
        id: i,
      };
    })
    .sort((a, b) => -a.group.localeCompare(b.group));

  const handleChange = (
    _event: SyntheticEvent,
    value: { item: AbiFunction } | null,
  ) => {
    setCurrentItem(value?.item);
  };

  return (
    <Stack alignItems="flex-start" spacing={2}>
      <Autocomplete
        autoFocus
        selectOnFocus
        sx={{ minWidth: "100%" }}
        groupBy={(option) => option.group}
        options={options}
        onChange={handleChange}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderInput={(params) => <TextField {...params}>as</TextField>}
        renderOption={(props, { label, item }) => (
          <Box component="li" {...props}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={item.stateMutability} />
              <Box>{label}</Box>
            </Stack>
          </Box>
        )}
      />

      {currentItem && <ItemForm contract={address} item={currentItem} />}
    </Stack>
  );
}

interface CallArgs {
  value?: string;
  args: Record<string, { raw: string; parsed: string }>;
}

interface ItemFormProps {
  contract: Address;
  item: AbiFunction;
}

function ItemForm({ contract, item }: ItemFormProps) {
  const account = useWallets((s) => s.address);
  const chainId = useNetworks((s) => s.current?.chain_id);
  const form = useForm<CallArgs>();
  const [callResult, setCallResult] = useState<string>();
  const [txResult, setTxResult] = useState<string>();

  useEffect(() => form.reset(), [item, form]);

<<<<<<< HEAD
  const watcher = useWatch({ control: form.control });
  const debouncedParams = useDebounce(watcher, 200);
  const [data, setData] = useState<`0x${string}` | undefined>();
  const [value, setValue] = useState<bigint | undefined>();

  useEffect(() => {
    const params = form.getValues();
    try {
      const args = item.inputs.map((input, i) =>
        JSON.parse(params.args[input.name || i.toString()].parsed),
      );

      const data = encodeFunctionData({
        abi: [item],
        functionName: item.name,
        args,
      });
      setData(data);
      setValue(BigInt(params.value || 0));
    } catch (e) {
      setData(undefined);
      setValue(undefined);
    }
  }, [debouncedParams, item, form, setData]);

  const onSubmit = async (params: FieldValues) => {
    const args = item.inputs.map((input, i) =>
      JSON.parse(params.args[input.name || i.toString()].parsed),
    );

    const data = encodeFunctionData({
      abi: [item],
      functionName: item.name,
      args,
    });

    if (item.stateMutability === "view") {
      const rawResult = await invoke<`0x${string}`>("rpc_eth_call", {
        params: {
          from: account,
          to: contract,
          value: params.value,
          data,
        },
      });

      const result = decodeFunctionResult({
        abi: [item],
        functionName: item.name,
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
              {item.inputs.map((item, index) => (
                <ABIInput
                  key={index}
                  name={`args.${item.name || index}`}
                  type={item}
                />
              ))}
              {item.stateMutability === "payable" && (
                <ABIInput name="value" type="uint256" />
              )}
              <Button
                sx={{ minWidth: 150 }}
                variant="contained"
                type="submit"
                disabled={!data || !account}
              >
                {item.stateMutability == "view" ? "Call" : "Send"}
              </Button>
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
                abi: [item],
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
