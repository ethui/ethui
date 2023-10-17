import { Autocomplete, Box, Button, Chip, TextField } from "@mui/material";
import { Stack } from "@mui/system";
import { Abi, AbiFunction, formatAbiItem } from "abitype";
import { SyntheticEvent, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { encodeFunctionData } from "viem";

import { post } from "@/api";
import { useApi, useProvider } from "@/hooks";
import { useWallets } from "@/store";
import { Address } from "@/types";

interface Props {
  chainId: number;
  address: Address;
}

export function ABIForm({ chainId, address }: Props) {
  const [currentItem, setCurrentItem] = useState<AbiFunction | undefined>();

  const { data: abi } = useApi<Abi>("/contracts/abi", {
    address,
    chainId,
  });

  if (!abi) return null;

  const options = abi
    .filter(({ type }) => type === "function")
    .map((item, i) => ({
      item: item as AbiFunction,
      label: formatAbiItem(item),
      id: i,
    }));

  const handleChange = (
    _event: SyntheticEvent,
    value: { item: AbiFunction } | null,
  ) => {
    setCurrentItem(value?.item);
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
  const address = useWallets((s) => s.address);
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
      const result = await provider.readContract({
        address: contract,
        abi: [item],
        functionName: item.name as never, // TODO: no idea why ts thinks this is `never`. code seems to work
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
      const result = await post<string>("/transactions/send_transaction", {
        from: address,
        to: contract,
        value: params.value,
        data,
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
        {callResult && <Box>{callResult}</Box>}
        {txResult && <Box>{txResult}</Box>}
      </Stack>
    </form>
  );
}
