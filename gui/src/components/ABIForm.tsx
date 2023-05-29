import { Autocomplete, Box, Button, Chip, TextField } from "@mui/material";
import { Stack } from "@mui/system";
import { invoke } from "@tauri-apps/api/tauri";
import { SyntheticEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { encodeFunctionData } from "viem";

import { useProvider } from "../hooks/useProvider";
import { ABIFunctionInput, ABIItem, Address } from "../types";

interface Props {
  address: Address;
  abi: ABIItem[];
}

export function ABIForm({ address, abi }: Props) {
  const [currentItem, setCurrentItem] = useState<ABIItem | undefined>();

  const options = abi
    .filter((item) => item.type === "function")
    .map((item, i) => ({
      item,
      label: functionSignature(item.name, item.inputs),
      id: i,
    }));

  const handleChange = (
    _event: SyntheticEvent,
    value: { item: ABIItem } | null
  ) => {
    if (value === null) {
      setCurrentItem(undefined);
    } else {
      setCurrentItem(value.item);
    }
  };

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
  args: Record<string, string>;
}

function ABIItemForm({ contract, item }: { contract: Address; item: ABIItem }) {
  const provider = useProvider();
  const { register, handleSubmit } = useForm<CallArgs>();
  const [callResult, setCallResult] = useState<string>();
  const [txResult, setTxResult] = useState<string>();

  if (!provider) return null;

  const onSubmit = async (params: CallArgs) => {
    const args = item.inputs.map((input) => params.args[input.name]);

    const data = encodeFunctionData({
      abi: [item],
      functionName: item.name,
      args,
    });

    if (item.stateMutability === "view") {
      const result = await provider.readContract({
        address: contract,
        abi: [item],
        functionName: item.name,
        args,
      });

      if (typeof result === "bigint") {
        setCallResult(result.toString());
      } else if (typeof result === "string") {
        setCallResult(result);
      } else {
        setCallResult(JSON.stringify(result));
      }
    } else {
      const result = await invoke<string>("rpc_send_transaction", {
        params: { to: contract, data },
      });
      setTxResult(result);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack direction="column" spacing={2} justifyContent="flex-start">
        {item.inputs.map(({ name, type }, key) => (
          <Box key={key}>
            <TextField
              sx={{ minWidth: 300 }}
              size="small"
              {...register(`args.${name}`)}
              label={`${name} (${type})`}
            />
          </Box>
        ))}
        {item.stateMutability === "payable" && (
          <TextField size="small" {...register("value")} label="value" />
        )}
        <Box>
          <Button sx={{ minWidth: 150 }} variant="contained" type="submit">
            {item.stateMutability == "view" ? "Call" : "Send"}
          </Button>
        </Box>
        {callResult && <Box>{callResult}</Box>}
        {txResult && <Box>{txResult}</Box>}
      </Stack>
    </form>
  );
}

// TODO: this may be missing some details, such as `calldata`
function functionSignature(name: string, inputs: ABIFunctionInput[]) {
  return `${name}(${inputs.map((i) => `${i.type} ${i.name}`).join(", ")})`;
}
