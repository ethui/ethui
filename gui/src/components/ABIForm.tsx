import { Autocomplete, Box, Button, Chip, TextField } from "@mui/material";
import { Stack } from "@mui/system";
import { invoke } from "@tauri-apps/api/tauri";
import { ethers } from "ethers";
import { SyntheticEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { useProvider } from "wagmi";

import { ABIFunctionInput, ABIItem, Address } from "../types";

interface Props {
  address: Address;
  abi: ABIItem[];
}

export function ABIForm({ address, abi }: Props) {
  const [currentItem, setCurrentItem] = useState<ABIItem | undefined>();

  const functions = abi.filter((item) => item.type === "function");

  const options = functions.map((item, i) => ({
    item,
    label: functionSignature(item.name, item.inputs),
    id: i,
  }));

  const handleChange = (_event: SyntheticEvent, value: any | null) => {
    if (value === null) {
      setCurrentItem(undefined);
    } else {
      setCurrentItem(value.item);
    }
  };

  console.log(options);

  return (
    <Stack alignItems="flex-start" spacing={2}>
      <Autocomplete
        sx={{ minWidth: "100%" }}
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

      {currentItem && <ABIItemForm contract={address} item={currentItem} />}
    </Stack>
  );
}

interface CallArgs {
  value?: string;
  args: Record<string, unknown>;
}

function ABIItemForm({ contract, item }: { contract: Address; item: ABIItem }) {
  const provider = useProvider();
  const { register, handleSubmit } = useForm<CallArgs>();
  const [callResult, setCallResult] = useState<
    ethers.utils.Result | undefined
  >();

  console.log(callResult);
  const iface = new ethers.utils.Interface([item]);
  const paramNames = iface.getFunction(item.name).inputs.map((i) => i.name);

  const onSubmit = async (params: CallArgs) => {
    const data = iface.encodeFunctionData(
      item.name,
      paramNames.map((name) => params.args[name])
    );

    if (item.stateMutability === "view") {
      const result = await provider.call({ to: contract, data });
      setCallResult(iface.decodeFunctionResult(item.name, result));
    } else {
      invoke("rpc_send_transaction", { params: { to: contract, data } });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack direction="column" spacing={2}>
        {item.inputs.map(({ name, type }, key) => (
          <TextField
            size="small"
            key={key}
            {...register(`args.${name}`)}
            label={`${name} (${type})`}
          />
        ))}
        {item.stateMutability === "payable" && (
          <TextField size="small" {...register("value")} label="value" />
        )}
        <Button variant="contained" type="submit">
          {item.stateMutability == "view" ? "Call" : "Send"}
        </Button>
        {callResult && <Box>{callResult.map((value) => value.toString())}</Box>}
      </Stack>
    </form>
  );
}

// TODO: this may be missing some details, such as `calldata`
function functionSignature(name: string, inputs: ABIFunctionInput[]) {
  return `${name}(${inputs.map((i) => `${i.type} ${i.name}`).join(", ")})`;
}
