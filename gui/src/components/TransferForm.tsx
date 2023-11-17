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
import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import {
  AbiItem,
  Address,
  encodeFunctionData,
  formatUnits,
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

interface TransferFormProps {
  onClose: () => void;
}

export function TransferForm({ onClose }: TransferFormProps) {
  const currentNetwork = useNetworks((s) => s.current);
  const currentAddress = useWallets((s) => s.address);
  const { nativeBalance, erc20Balances } = useBalances((s) => {
    return { nativeBalance: s.nativeBalance, erc20Balances: s.erc20Balances };
  });

  const allTokens = [
    {
      symbol: currentNetwork.currency,
      decimals: currentNetwork.decimals,
      balance: nativeBalance,
      contract: "" as `0x${string}`,
    },
  ].concat(
    erc20Balances.map((token) => {
      const {
        metadata: { symbol, decimals },
        balance,
        contract,
      } = token;
      return {
        contract,
        symbol,
        decimals,
        balance: BigInt(balance),
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

  const [selectedToken, setSelectedToken] = useState<string>("");
  const [selectedTokenBalance, setSelectedTokenBalance] = useState<string>("");
  const [txResult, setTxResult] = useState<{ success: boolean; msg: string }>({
    success: false,
    msg: "",
  });

  useEffect(() => {
    if (!selectedToken) return;

    const tokenInfo = allTokens.find((t) => t.symbol === selectedToken);

    if (tokenInfo && tokenInfo.balance) {
      const { balance, decimals } = tokenInfo;

      const tokenBalance = formatTokenBalance(balance, decimals);

      setSelectedTokenBalance(tokenBalance);
    }
  }, [allTokens, selectedToken]);

  const submitTransferForm = async (formData: FieldValues) => {
    const token = allTokens.find((t) => t.symbol === selectedToken);

    if (currentAddress && token && token.balance) {
      const transferAmount = BigInt(formData.value * 10 ** token.decimals);

      if (transferAmount > token.balance) {
        setTxResult({ success: false, msg: "Not enough balance" });
        return;
      }

      const transfer =
        selectedToken === currentNetwork.currency
          ? transferNative
          : transferERC20;

      const result = await transfer(
        currentAddress,
        formData.address,
        transferAmount,
        token.contract,
      );

      if (result.match(/(0x[a-fA-F0-9]{40})/)) {
        setTxResult({ success: true, msg: result });
      } else {
        const match = result.match(/message:\s([^\,]+)/);
        let errorMsg = "Error";
        if (match && match[1]) errorMsg = match[1];
        setTxResult({ success: false, msg: errorMsg });
      }
    }
  };

  const formatTokenBalance = (balance: bigint, decimals: number) =>
    formatUnits(
      balance - (balance % BigInt(Math.ceil(0.001 * 10 ** decimals))),
      decimals,
    );

  return (
    <form onSubmit={handleSubmit(submitTransferForm)}>
      <Stack alignItems="flex-start" spacing={2}>
        <Typography>Transfer token</Typography>

        <FormControl fullWidth>
          <InputLabel id="select-token-label">Token</InputLabel>
          <Select
            labelId="select-token-label"
            label="Token"
            value={selectedToken}
            onChange={(e: SelectChangeEvent) => {
              setSelectedToken(e.target.value);
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
            Balance: {selectedTokenBalance}
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
