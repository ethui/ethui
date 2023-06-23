import { CallMade, NoteAdd, VerticalAlignBottom } from "@mui/icons-material";
import {
  Badge,
  Box,
  List,
  ListItem,
  ListItemAvatar,
  Stack,
  Typography,
} from "@mui/material";
import { createElement, useEffect } from "react";
import useSWR from "swr";
import { type TransactionReceipt, formatEther } from "viem";

import { useInvoke, useProvider, useRefreshTransactions } from "../hooks";
import { useWallets } from "../store";
import { Address, Tx } from "../types";
import { AddressView, ContextMenu, Panel } from "./";

export function Txs() {
  const account = useWallets((s) => s.address);
  const { data: txs, mutate } = useInvoke<Tx[]>("db_get_transactions", {
    address: account,
  });

  useRefreshTransactions(mutate);

  if (!account) return null;

  return (
    <Panel>
      <List>
        {(txs || []).map((tx) => (
          <Receipt account={account} tx={tx} key={tx.hash} />
        ))}
      </List>
    </Panel>
  );
}

interface ReceiptProps {
  account: Address;
  tx: Tx;
}

function Receipt({ account, tx }: ReceiptProps) {
  const provider = useProvider();
  /// TODO: currently doing an RPC request per transaction, because we don't know the status
  /// we need to remove this at some point
  const { data: receipt, mutate } = useSWR(
    !!provider && ["getTransactionReceipt", tx.hash],
    ([, hash]) => provider?.getTransactionReceipt({ hash })
  );

  const value = BigInt(tx.value);

  useEffect(() => {
    mutate();
  }, [provider, mutate]);

  if (!receipt) return null;

  return (
    <ListItem>
      <ListItemAvatar>
        <Icon {...{ receipt, tx, account }} />
      </ListItemAvatar>
      <Box sx={{ flexGrow: 1 }}>
        <Stack>
          <Stack direction="row" spacing={1}>
            <AddressView address={receipt.from} /> <span>→</span>
            {receipt.to ? (
              <AddressView address={receipt.to} />
            ) : (
              <Typography component="span">Contract Deploy</Typography>
            )}
          </Stack>
          <Typography variant="caption" fontSize="xl">
            Block #{tx.blockNumber?.toLocaleString()}
          </Typography>
        </Stack>
      </Box>
      <Box>
        {value > 0n && (
          <ContextMenu copy={value.toString()}>
            {formatEther(value)} Ξ
          </ContextMenu>
        )}
      </Box>
    </ListItem>
  );
}

interface IconProps {
  account: Address;
  receipt: TransactionReceipt;
  tx: Tx;
}

function Icon({ account, receipt, tx }: IconProps) {
  const color = receipt.status === "success" ? "success" : "error";

  let icon = CallMade;

  if (tx.to == account) {
    icon = VerticalAlignBottom;
  } else if (!tx.to) {
    icon = NoteAdd;
  }

  return <Badge>{createElement(icon, { color })}</Badge>;
}
