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
import { SelectChangeEvent } from "@mui/material/Select";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import {
  AbiItem,
  Address,
  encodeFunctionData,
  formatUnits,
  parseAbiItem,
} from "viem";
import { z } from "zod";

import { addressSchema } from "@ethui/types/wallets";
import { useBalances, useNetworks, useWallets } from "@/store";

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
  symbol: string;
  decimals: number;
  balance: bigint;
  contract: Address;
}

interface TransferFormProps {
  onClose: () => void;
}

export function TransferForm({ onClose }: TransferFormProps) {
  const currentNetwork = useNetworks((s) => s.current);
  const currentAddress = useWallets((s) => s.address);
  const { nativeBalance, erc20Balances } = useBalances((s) => {
    return { nativeBalance: s.nativeBalance, erc20Balances: s.erc20Balances };
  });

  const allTokens: Token[] = [
    {
      symbol: currentNetwork?.currency || "",
      decimals: currentNetwork?.decimals || 18,
      balance: nativeBalance || 0n,
      contract: "" as Address,
    },
  ].concat(
    erc20Balances.map((token) => {
      const {
        metadata: { symbol, decimals },
        balance,
        contract,
      } = token;
      return {
        symbol,
        decimals,
        balance: BigInt(balance),
        contract,
      };
    }),
  );

  const {
    handleSubmit,
    register,
    formState: { isDirty, isValid, errors },
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(
      z.object({
        address: addressSchema,
        value: z.number().positive(),
      }),
    ),
  });

  const [selectedToken, setSelectedToken] = useState<Token>();
  const [txResult, setTxResult] = useState<{ success: boolean; msg: string }>({
    success: false,
    msg: "",
  });

  const handleSelect = (selectedSymbol: string) => {
    const token = allTokens.find((t) => t.symbol === selectedSymbol);
    setSelectedToken(token);
  };

  const submitTransfer = async (formData: FieldValues) => {
    if (currentNetwork && currentAddress && selectedToken) {
      const { symbol, balance, decimals, contract } = selectedToken;

      const transferAmount = BigInt(formData.value * 10 ** decimals);

      if (transferAmount > balance) {
        setTxResult({ success: false, msg: "Not enough balance" });
        return;
      }

      let txResult;
      if (symbol === currentNetwork.currency)
        txResult = await transferNative(
          currentAddress,
          formData.address,
          transferAmount,
        );
      else
        txResult = await transferERC20(
          currentAddress,
          formData.address,
          transferAmount,
          contract,
        );

      if (txResult.match(/(0x[a-fA-F0-9]{40})/)) {
        setTxResult({ success: true, msg: txResult });
      } else {
        const errorMsg = txResult.match(/message:\s([^\,]+)/)?.[1] || "Error";
        setTxResult({ success: false, msg: errorMsg });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(submitTransfer)}>
      <Stack alignItems="flex-start" spacing={2}>
        <Typography>Transfer token</Typography>

        <FormControl fullWidth>
          <InputLabel id="select-token-label">Token</InputLabel>
          <Select
            labelId="select-token-label"
            label="Token"
            value={selectedToken?.symbol || ""}
            onChange={(e: SelectChangeEvent) => {
              handleSelect(e.target.value);
            }}
          >
            {allTokens.map(({ symbol }) => (
              <MenuItem key={symbol} value={symbol}>
                {symbol}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedToken && (
          <Typography variant="body2">
            Balance:{" "}
            {formatTokenBalance(selectedToken.balance, selectedToken.decimals)}
          </Typography>
        )}

        <TextField
          label="To address"
          error={!!errors.address}
          helperText={errors.address?.message?.toString() || " "}
          fullWidth
          {...register("address")}
        />

        <TextField
          label="Value"
          error={!!errors.value}
          helperText={errors.value?.message?.toString() || " "}
          fullWidth
          {...register("value", { valueAsNumber: true })}
        />

        {txResult.msg && (
          <Alert
            sx={{ alignSelf: "stretch" }}
            variant="outlined"
            severity={txResult.success ? "success" : "error"}
          >
            <Typography variant="body2" noWrap>
              {txResult.msg}
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
