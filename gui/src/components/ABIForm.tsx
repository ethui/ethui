import { Autocomplete, Button, TextField } from "@mui/material";
import { Stack } from "@mui/system";
import { invoke } from "@tauri-apps/api/tauri";
import { ethers } from "ethers";
import { SyntheticEvent, useState } from "react";
import { useForm } from "react-hook-form";

import { ABIFunctionInput, ABIItem, Address } from "../types";

interface Props {
  address: Address;
  abi: ABIItem[];
}

export function ABIForm({ address, abi }: Props) {
  const [currentItem, setCurrentItem] = useState<ABIItem | undefined>();

  const functions = abi.filter((item) => item.type === "function");

  const options = functions.map((f, i) => ({
    item: f,
    label: functionSignature(f.name, f.inputs),
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
        renderInput={(params) => <TextField {...params} />}
        onChange={handleChange}
        isOptionEqualToValue={(option, value) => option.id == value.id}
      />

      {currentItem && <ABIItemForm contract={address} item={currentItem} />}
    </Stack>
  );
}

function ABIItemForm({ contract, item }: { contract: Address; item: ABIItem }) {
  const { register, handleSubmit } = useForm();

  const iface = new ethers.utils.Interface([item]);
  const paramNames = iface.getFunction(item.name).inputs.map((i) => i.name);

  const onSubmit = (params: Record<string, unknown>) => {
    const data = iface.encodeFunctionData(
      item.name,
      paramNames.map((name) => params[name])
    );
    invoke("rpc_send_transaction", { params: { to: contract, data } });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack direction="column" spacing={2}>
        {item.inputs.map(({ name, type }, key) => (
          <TextField
            size="small"
            key={key}
            {...register(name)}
            label={`${name} (${type})`}
          />
        ))}
        <Button variant="contained" type="submit">
          Call
        </Button>
      </Stack>
    </form>
  );
}

// TODO: this may be missing some details, such as `calldata`
function functionSignature(name: string, inputs: ABIFunctionInput[]) {
  return `${name}(${inputs.map((i) => `${i.type} ${i.name}`).join(", ")})`;
}
