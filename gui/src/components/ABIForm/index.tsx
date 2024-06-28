import { Autocomplete, Box, Chip, TextField } from "@mui/material";
import { Stack } from "@mui/system";
import { type Abi, type AbiFunction, formatAbiItem } from "abitype";
import { Fragment, type SyntheticEvent, useState } from "react";

import type { Address } from "viem";

import { useInvoke } from "@/hooks";
import { ABIItemForm } from "./ABIItemForm";

export { ABIItemForm };

interface Props {
  chainId: number;
  address: Address;
}

export function ABIForm({ chainId, address }: Props) {
  const [currentItem, setCurrentItem] = useState<
    AbiFunction | "raw" | undefined
  >();

  const { data: abi } = useInvoke<Abi>("db_get_contract_abi", {
    address,
    chainId,
  });

  if (!abi) return null;

  const options = abi
    .filter(({ type }) => type === "function")
    .map((abiItem, i) => {
      const item = abiItem as AbiFunction;
      return {
        item: item as AbiFunction | "raw",
        label: formatAbiItem(item).replace("function ", ""),
        group: item.stateMutability === "view" ? "view" : "write",
        id: i,
      };
    })
    .concat([
      {
        item: "raw",
        label: "Raw",
        group: "Raw",
        id: -1,
      },
    ])
    .sort((a, b) => -a.group.localeCompare(b.group));

  const handleChange = (
    _event: SyntheticEvent,
    value: { item: AbiFunction | "raw" } | null,
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
          <Box component="li" {...props} key={JSON.stringify(item)}>
            <Stack direction="row" spacing={1} alignItems="center">
              {item !== "raw" && <Chip label={item.stateMutability} />}
              <Box>{label}</Box>
            </Stack>
          </Box>
        )}
      />

      {currentItem && (
        <Fragment key={JSON.stringify(currentItem)}>
          <ABIItemForm
            to={address}
            abiItem={currentItem !== "raw" ? currentItem : undefined}
          />
        </Fragment>
      )}
    </Stack>
  );
}
