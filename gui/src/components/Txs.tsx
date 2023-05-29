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

import { useAccount } from "../hooks";
import { useInvoke } from "../hooks/tauri";
import { useProvider } from "../hooks/useProvider";
import { useRefreshTransactions } from "../hooks/useRefreshTransactions";
import { Address, Tx } from "../types";
import { AddressView } from "./AddressView";
import { ContextMenu } from "./ContextMenu";
import Panel from "./Panel";

export function Txs() {
  const account = useAccount();
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
          <Box>
            <AddressView address={receipt.from} /> →{" "}
            {receipt.to ? (
              <AddressView address={receipt.to} />
            ) : (
              <Typography component="span">Contract Deploy</Typography>
            )}
          </Box>
          <Typography variant="caption" fontSize="xl">
            Block #{tx.blockNumber?.toLocaleString()}
          </Typography>
        </Stack>
      </Box>
      <Box>
        <ContextMenu>{formatEther(BigInt(tx.value))} Ξ</ContextMenu>
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
