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
import { createElement } from "react";
import { useEffect } from "react";
import useSWR from "swr";
import truncateEthAddress from "truncate-eth-address";
import { type Transaction, type TransactionReceipt, formatEther } from "viem";

import { useAccount } from "../hooks";
import { useInvoke } from "../hooks/tauri";
import { useProvider } from "../hooks/useProvider";
import { useRefreshTransactions } from "../hooks/useRefreshTransactions";
import { Address } from "../types";
import { ContextMenu } from "./ContextMenu";
import Panel from "./Panel";

export function Txs() {
  const account = useAccount();
  const { data: hashes, mutate } = useInvoke<`0x${string}`[]>(
    "db_get_transactions",
    {
      address: account,
    }
  );

  useRefreshTransactions(mutate);

  if (!account) return null;

  return (
    <Panel>
      <List>
        {(hashes || []).map((hash) => (
          <Receipt account={account} key={hash} hash={hash} />
        ))}
      </List>
    </Panel>
  );
}

interface ReceiptProps {
  account: Address;
  hash: `0x${string}`;
}

function Receipt({ account, hash }: ReceiptProps) {
  const provider = useProvider();

  const { data: tx, mutate: mutate1 } = useSWR(
    !!provider && ["getTransaction", hash],
    ([, hash]) => provider?.getTransaction({ hash })
  );

  const { data: receipt, mutate: mutate2 } = useSWR(
    !!provider && ["getTransactionReceipt", hash],
    ([, hash]) => provider?.getTransactionReceipt({ hash })
  );

  useEffect(() => {
    mutate1();
    mutate2();
  }, [provider, mutate1, mutate2]);

  if (!receipt || !tx) return null;

  return (
    <ListItem>
      <ListItemAvatar>
        <Icon {...{ receipt, tx, account }} />
      </ListItemAvatar>
      <Box sx={{ flexGrow: 1 }}>
        <Stack>
          <Box>
            <ContextMenu label={receipt.from} sx={{ textTransform: "none" }}>
              {truncateEthAddress(receipt.from)}
            </ContextMenu>{" "}
            →{" "}
            {receipt.to ? (
              <ContextMenu label={receipt.to} sx={{ textTransform: "none" }}>
                {truncateEthAddress(receipt.to)}
              </ContextMenu>
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
        <ContextMenu>{formatEther(tx.value)} Ξ</ContextMenu>
      </Box>
    </ListItem>
  );
}

interface IconProps {
  account: Address;
  receipt: TransactionReceipt;
  tx: Transaction;
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
