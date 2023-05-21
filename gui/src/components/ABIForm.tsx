import { Autocomplete, Button, TextField } from "@mui/material";
import { Stack } from "@mui/system";
import { SyntheticEvent, useState } from "react";

import { Address } from "../types";

interface ABIFunctionInput {
  name: string;
  type: string;
}

interface ABIItem {
  name: string;
  type: "error" | "function" | "constructor";
  stateMutability: "view" | "pure" | "nonpayable" | "payable";
  inputs: ABIFunctionInput[];
}

interface Props {
  address: Address;
  abi: ABIItem[];
}

export function ABIForm({ abi }: Props) {
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

      {currentItem && <ABIItemForm item={currentItem} />}
    </Stack>
  );
}

function ABIItemForm({ item }: { item: ABIItem }) {
  return (
    <Stack direction="column" spacing={2}>
      {item.inputs.map(({ name, type }, key) => (
        <TextField size="small" key={key} label={`${name} (${type})`} />
      ))}
      <Button variant="contained" type="submit">
        Call
      </Button>
    </Stack>
  );
}

function functionSignature(name: string, inputs: ABIFunctionInput[]) {
  return `${name}(${inputs.map((i) => `${i.type} ${i.name}`).join(", ")})`;
}
