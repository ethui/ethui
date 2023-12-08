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

const transferNative = async (from: Address, to: Address, value: bigint) => {
  return await invoke<string>("rpc_send_transaction", {
    params: {
      from,
      to,
      value,
    },
  });
};

const transferERC20 = async (
  from: Address,
  to: Address,
  value: bigint,
  contract: Address,
) => {
  const abiItem: AbiItem = parseAbiItem([
    `function transfer(address to, uint amount) returns (bool)`,
  ]);

  const data = encodeFunctionData({
    abi: [abiItem],
    args: [to, value],
  });

  return await invoke<string>("rpc_send_transaction", {
    params: {
      from,
      to: contract,
      data,
    },
  });
};

const formatTokenBalance = (balance: bigint, decimals: number) =>
  formatUnits(
    balance - (balance % BigInt(Math.ceil(0.001 * 10 ** decimals))),
    decimals,
  );

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
  const { nativeBalance, erc20Balances } = useBalances((s) => {
    return { nativeBalance: s.nativeBalance, erc20Balances: s.erc20Balances };
  });

  const [tokens, setTokens] = useState<Map<Address, Token>>(new Map());

  useEffect(() => {
    const newTokens = new Map<Address, Token>(
      erc20Balances.map((token) => {
        const {
          metadata: { symbol, decimals },
          balance,
          contract,
        } = token;
        return [
          contract,
          {
            currency: symbol,
            decimals,
            balance: BigInt(balance),
            contract,
          },
        ];
      }),
    );
    newTokens.set(ZeroAddress, {
      currency: network?.currency || "ETH",
      decimals: network?.decimals || 18,
      balance: nativeBalance || 0n,
      contract: ZeroAddress,
    });
    setTokens(newTokens);
  }, [
    setTokens,
    nativeBalance,
    erc20Balances,
    network?.currency,
    network?.decimals,
  ]);

  const schema = z.object({
    address: addressSchema,
    currency: addressSchema,
    value: z
      .number()
      .positive()
      .superRefine((rawValue, ctx) => {
        if (!currentToken) return;
        const value =
          BigInt(rawValue) * BigInt(10) ** BigInt(currentToken.decimals);
        if (value <= currentToken.balance) return;
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
      address: null,
      value: 0,
    },
  });

  const currentContract = watch("currency");
  const currentToken = tokens.get(currentContract)!;

  const [result, setResult] = useState({
    success: false,
    msg: "",
  });

  if (!network || !address || !currentToken) return null;

  const onSubmit = async (formData: FieldValues) => {
    console.log(formData);
    return;
    const { decimals, contract } = currentToken;

    const value = BigInt(formData.value * 10 ** decimals);

    let result;
    if (!contract)
      result = await transferNative(address, formData.address, value);
    else
      result = await transferERC20(address, formData.address, value, contract);

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
            Balance:{" "}
            {formatTokenBalance(currentToken.balance, currentToken.decimals)}
          </Typography>
        )}

        <TextField
          label="To"
          error={!!errors.address}
          helperText={errors.address?.message?.toString() || " "}
          fullWidth
          {...register("address")}
        />

        <TextField
          label="Amount"
          error={!!errors.value}
          helperText={errors.value?.message?.toString() || " "}
          fullWidth
          {...register("value", { valueAsNumber: true })}
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
