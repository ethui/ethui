import { zodResolver } from "@hookform/resolvers/zod";
import SendIcon from "@mui/icons-material/Send";
import {
  Avatar,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import truncateEthAddress from "truncate-eth-address";
import {
  AbiItem,
  Address,
  encodeFunctionData,
  formatUnits,
  parseAbiItem,
} from "viem";
import { z } from "zod";

import { useInvoke } from "@/hooks";
import { useBalances, useNetworks, useWallets } from "@/store";
import { GeneralSettings } from "@/types";
import { addressSchema } from "@/types/wallets";

import { CopyToClipboard, IconCrypto, Modal } from "./";

export function BalancesList() {
  return (
    <List>
      <BalanceETH />
      <BalancesERC20 />
    </List>
  );
}

function BalanceETH() {
  const currentNetwork = useNetworks((s) => s.current);
  const balance = useBalances((s) => s.nativeBalance);
  const currAddress = useWallets((s) => s.address);

  if (!currentNetwork || !balance) return null;

  const transferEth = async (to: Address, amount: bigint) => {
    await invoke<string>("rpc_send_transaction", {
      params: {
        from: currAddress,
        to,
        value: amount,
      },
    });
  };

  return (
    <BalanceItem
      balance={balance}
      decimals={currentNetwork.decimals}
      symbol={currentNetwork.currency}
      transfer={transferEth}
    />
  );
}

function BalancesERC20() {
  const balances = useBalances((s) => s.erc20Balances);
  const currAddress = useWallets((s) => s.address);

  const { data: settings } = useInvoke<GeneralSettings>("settings_get");

  const filteredBalances = (balances || []).filter(
    (token) => !settings?.hideEmptyTokens || BigInt(token.balance) > 0,
  );

  const transferERC20 = async (
    to: Address,
    amount: bigint,
    contract?: Address,
  ) => {
    const abiItem: AbiItem = parseAbiItem([
      `function transfer(address to, uint amount) returns (bool)`,
    ]);

    const data = encodeFunctionData({
      abi: [abiItem],
      args: [to, amount],
    });

    await invoke<string>("rpc_send_transaction", {
      params: {
        from: currAddress,
        to: contract,
        data,
      },
    });
  };

  return (
    <>
      {filteredBalances.map(({ contract, balance, metadata }) => (
        <BalanceItem
          key={contract}
          contract={contract}
          balance={BigInt(balance)}
          decimals={metadata.decimals}
          symbol={metadata.symbol}
          transfer={transferERC20}
        />
      ))}
    </>
  );
}

interface BalanceItemProps {
  contract?: Address;
  balance: bigint;
  decimals: number;
  symbol: string;
  transfer: (to: Address, amount: bigint, contract?: Address) => void;
}

function BalanceItem({
  balance,
  decimals,
  symbol,
  contract,
  transfer,
}: BalanceItemProps) {
  const [transferFormOpen, setTransferFormOpen] = useState(false);

  const minimum = 0.001;
  // Some tokens respond with 1 decimals, that breaks this truncatedBalance without the Math.ceil
  const truncatedBalance =
    balance - (balance % BigInt(Math.ceil(minimum * 10 ** decimals)));

  if (!symbol || !decimals) return null;

  return (
    <>
      <ListItem>
        <ListItemAvatar>
          <Avatar>
            <IconCrypto ticker={symbol} />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          secondary={`${symbol} ${
            contract ? `(${truncateEthAddress(contract)})` : ``
          }`}
        >
          <CopyToClipboard label={balance.toString()}>
            {truncatedBalance > 0
              ? formatUnits(truncatedBalance, decimals)
              : `< ${minimum}`}
          </CopyToClipboard>
        </ListItemText>
        <ListItemButton onClick={() => setTransferFormOpen(true)}>
          <SendIcon></SendIcon>
        </ListItemButton>
      </ListItem>

      <Modal open={transferFormOpen} onClose={() => setTransferFormOpen(false)}>
        <TransferForm
          {...{ symbol, contract, decimals }}
          onSubmit={transfer}
          onClose={() => setTransferFormOpen(false)}
        />
      </Modal>
    </>
  );
}

interface TransferFormProps {
  symbol: string;
  contract?: Address;
  decimals: number;
  onSubmit: (to: Address, amount: bigint, contract?: Address) => void;
  onClose: () => void;
}

function TransferForm({
  symbol,
  contract,
  decimals,
  onSubmit,
  onClose,
}: TransferFormProps) {
  const {
    handleSubmit,
    register,
    formState: { isDirty, isValid, errors },
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(
      z.object({
        address: addressSchema,
        amount: z.number().positive(),
      }),
    ),
  });

  const submit = (data: FieldValues) => {
    onSubmit(data.address, BigInt(data.amount * 10 ** decimals), contract);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(submit)}>
      <Stack alignItems="flex-start" spacing={2}>
        <Typography>Transfer {symbol}</Typography>

        <TextField
          label="To address"
          error={!!errors.address}
          helperText={errors.address?.message?.toString() || " "}
          fullWidth
          {...register("address")}
        />

        <TextField
          label="Amount"
          error={!!errors.amount}
          helperText={errors.amount?.message?.toString() || " "}
          fullWidth
          {...register("amount", { valueAsNumber: true })}
        />

        <Stack width="100%" direction="row" justifyContent="space-between">
          <Button variant="outlined" color="error" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            type="submit"
            disabled={!isDirty || !isValid}
          >
            Transfer
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
