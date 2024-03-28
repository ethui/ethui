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
import { useForm } from "react-hook-form";
import { Address, encodeFunctionData } from "viem";

import { useInvoke, useProvider } from "@/hooks";
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
  const account = useWallets(s => s.address);
  const provider = useProvider();
  const { register, handleSubmit, reset } = useForm<CallArgs>();
  const [callResult, setCallResult] = useState<string>();
  const [txResult, setTxResult] = useState<string>();

  useEffect(() => reset(), [item, reset]);

  if (!provider) return null;

  const onSubmit = async (params: CallArgs) => {
    const args = item.inputs.map((input) => params.args[input.name!]);

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
          <Box>
            <TextField
              sx={{ minWidth: 300 }}
              size="small"
              {...register("value")}
              label="value"
            />
          </Box>
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
  );
}
