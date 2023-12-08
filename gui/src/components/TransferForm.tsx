import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useState } from "react";
import { Controller, FieldValues, useForm } from "react-hook-form";
import {
  AbiItem,
  Address,
  encodeFunctionData,
  formatUnits,
  getAddress,
  parseAbiItem,
} from "viem";
import { z } from "zod";

import { useBalances, useNetworks, useWallets } from "@/store";
import { addressSchema } from "@/types/wallets";
import { BigIntField } from "./Inputs";

interface Token {
  currency: string;
  decimals: number;
  balance: bigint;
  contract: Address;
}

interface TransferFormProps {
  contract?: Address;
  onClose: () => void;
}

const ZeroAddress = getAddress("0x0000000000000000000000000000000000000000");

export function TransferForm({
  contract = ZeroAddress,
  onClose,
}: TransferFormProps) {
  const network = useNetworks((s) => s.current);
  const address = useWallets((s) => s.address);
  const { native, erc20s } = useBalances((s) => {
    return { native: s.nativeBalance, erc20s: s.erc20Balances };
  });

  // map list of tokens
  const [tokens, setTokens] = useState<Map<Address, Token>>(new Map());
  useEffect(() => {
    if (!network || !native) return;

    const newTokens = new Map<Address, Token>(
      erc20s.map(({ metadata, balance, contract }) => [
        contract,
        {
          currency: metadata.symbol,
          decimals: metadata.decimals,
          balance: BigInt(balance),
          contract: contract,
        },
      ]),
    );
    newTokens.set(ZeroAddress, {
      decimals: network.decimals,
      currency: network.currency,
      balance: native,
      contract: ZeroAddress,
    });
    setTokens(newTokens);
  }, [setTokens, native, erc20s, network]);

  const schema = z.object({
    to: addressSchema,
    currency: addressSchema,
    value: z
      .bigint()
      .positive()
      .superRefine((value, ctx) => {
        if (!currentToken || value <= currentToken.balance) return;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Not enough balance",
        });
      }),
  });

  const {
    handleSubmit,
    register,
    control,
    watch,
    formState: { isDirty, isValid, errors },
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: {
      currency: contract,
      to: null,
      value: 0n,
    },
  });

  const currentContract = watch("currency");
  const currentToken = tokens.get(currentContract)!;

  const [result, setResult] = useState({
    success: false,
    msg: "",
  });

  if (!network || !address || !currentToken) return null;

  const onSubmit = async (data: FieldValues) => {
    const { contract } = currentToken;
    const { to, value } = data;

    const result =
      contract === ZeroAddress
        ? await transferNative(address, to, value)
        : await transferERC20(address, to, value, contract);

    if (result.match(/(0x[a-fA-F0-9]{40})/)) {
      setResult({ success: true, msg: result });
    } else {
      const errorMsg = result.match(/message:\s([^\,]+)/)?.[1] || "Error";
      setResult({ success: false, msg: errorMsg });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack alignItems="flex-start" spacing={2}>
        <Typography>Transfer token</Typography>

        <FormControl fullWidth>
          <InputLabel id="select-token-label">Token</InputLabel>
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Select
                aria-labelledby="currency"
                label="Currency"
                sx={{ minWidth: 120 }}
                {...field}
              >
                {Array.from(tokens.values()).map(({ currency, contract }) => (
                  <MenuItem key={contract || ""} value={contract}>
                    {currency}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </FormControl>

        {currentToken && (
          <Typography variant="body2">
            Balance: {formatUnits(currentToken.balance, currentToken.decimals)}
          </Typography>
        )}

        <TextField
          label="To"
          error={!!errors.to}
          helperText={errors.to?.message?.toString() || ""}
          fullWidth
          {...register("to")}
        />

        <BigIntField
          name="value"
          control={control}
          decimals={currentToken.decimals}
        />

        {result.msg && (
          <Alert
            sx={{ alignSelf: "stretch" }}
            variant="outlined"
            severity={result.success ? "success" : "error"}
          >
            <Typography variant="body2" noWrap>
              {result.msg}
            </Typography>
          </Alert>
        )}

        <Stack width="100%" direction="row" justifyContent="space-between">
          <Button variant="outlined" color="error" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="contained"
            type="submit"
            disabled={!isDirty || !isValid}
          >
            Send
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}

const transferNative = async (from: Address, to: Address, value: bigint) => {
  return await invoke<`0x${string}`>("rpc_send_transaction", {
    params: {
      from,
      to,
      value,
    },
  });
};

const erc20transfer: AbiItem = parseAbiItem(
  `function transfer(address to, uint amount) returns (bool)`,
);

const transferERC20 = async (
  from: Address,
  to: Address,
  value: bigint,
  contract: Address,
) => {
  const data = encodeFunctionData({
    abi: [erc20transfer],
    args: [to, value],
  });

  return await invoke<`0x${string}`>("rpc_send_transaction", {
    params: {
      from,
      to: contract,
      data,
    },
  });
};
