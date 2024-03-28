import {
  Autocomplete,
  Box,
  Button,
  Chip,
  TextField,
  Typography,
} from "@mui/material";
import { Stack } from "@mui/system";
import { invoke } from "@tauri-apps/api";
import { Abi, AbiFunction, formatAbiItem } from "abitype";
import { SyntheticEvent, useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { Address, encodeFunctionData } from "viem";

import { useInvoke, useProvider } from "@/hooks";
import { ABIInput } from "./ABIInput";
import { useWallets } from "@/store";

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
  args: Record<string, string>;
}

interface ItemFormProps {
  contract: Address;
  item: AbiFunction;
}

function ItemForm({ contract, item }: ItemFormProps) {
  const account = useWallets((s) => s.address);
  const provider = useProvider();
  const form = useForm<CallArgs>();
  const [callResult, setCallResult] = useState<string>();
  const [txResult, setTxResult] = useState<string>();

  useEffect(() => form.reset(), [item, form]);

  if (!provider) return null;

  const onSubmit = async (params: CallArgs) => {
    const args = item.inputs.map((input, i) => {
      let arg = params.args[input.name || i.toString()];

      // type is an array
      // TODO: this is a bit of a hack. doesn't deal with more complex cases such as nested arrays
      // it's a temporary improvement that will need a much larger solution
      if (input.type.match(/\[\]$/)) {
        arg = JSON.parse(
          "[" + arg.replace(/^\s*\[/, "").replace(/\]\s*$/, "") + "]",
        );
      }
      return arg;
    });

    const data = encodeFunctionData({
      abi: [item],
      functionName: item.name,
      args,
    });

    if (item.stateMutability === "view") {
      const result = (await provider.readContract({
        address: contract,
        abi: [item],
        functionName: item.name,
        args,
      })) as bigint;

      if (typeof result === "bigint") {
        setCallResult(result.toString());
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
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack direction="column" spacing={2} justifyContent="flex-start">
          {item.inputs.map(({ name, type }, index) => (
            <ABIInput key={index} name={name || index.toString()} type={type} />
          ))}
          {item.stateMutability === "payable" && (
            <ABIInput name="value" type="uint256" />
          )}
          <Box>
            <Button sx={{ minWidth: 150 }} variant="contained" type="submit">
              {item.stateMutability == "view" ? "Call" : "Send"}
            </Button>
          </Box>
          {callResult && <Typography>{callResult}</Typography>}
          {txResult && <Typography>{txResult}</Typography>}
        </Stack>
      </form>
    </FormProvider>
  );
}
