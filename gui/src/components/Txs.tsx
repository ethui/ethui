import { CallMade, NoteAdd, VerticalAlignBottom } from "@mui/icons-material";
import {
  Avatar,
  Badge,
  Box,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  Stack,
  Typography,
} from "@mui/material";
import { green, red } from "@mui/material/colors";
import { formatEther } from "ethers/lib/utils";
import React, { createElement } from "react";
import { useEffect } from "react";
import useSWR from "swr";
import truncateEthAddress from "truncate-eth-address";

import { useAccount, useProvider } from "../hooks";
import { useInvoke } from "../hooks/tauri";
import { useRefreshTransactions } from "../hooks/useRefreshTransactions";
import { ContextMenu } from "./ContextMenu";
import Panel from "./Panel";

export function Txs() {
  const account = useAccount();
  const { data: hashes, mutate } = useInvoke<string[]>("db_get_transactions", {
    address: account,
  });

  useRefreshTransactions(mutate);

  return (
    <Panel>
      <List>
        {(hashes || []).map((hash) => (
          <Receipt key={hash} hash={hash} />
        ))}
      </List>
    </Panel>
  );
}

function Receipt({ hash }: { hash: string }) {
  const provider = useProvider();
  const { data: tx, mutate: mutate1 } = useSWR(
    !!provider && ["getTransaction", hash],
    ([, hash]) => provider?.getTransaction(hash)
  );
  const { data: receipt, mutate: mutate2 } = useSWR(
    !!provider && ["getTransactionReceipt", hash],
    ([, hash]) => provider?.getTransactionReceipt(hash)
  );

  useEffect(() => {
    mutate1();
    mutate2();
  }, [provider, mutate1, mutate2]);

  if (!receipt || !tx) return null;
  console.log(tx);
  console.log(receipt);

  return (
    <ListItem>
      <ListItemAvatar>
        <Icon receipt={receipt} tx={tx} />
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
            Block #{tx.blockNumber}
          </Typography>
        </Stack>
      </Box>
      <Box>
        <ContextMenu>{formatEther(tx.value)} Ξ</ContextMenu>
      </Box>
    </ListItem>
  );
}

function Icon({ receipt, tx }: any) {
  const address = useAccount();
  const color = receipt.status === 1 ? "success" : "error";

  let icon = CallMade;

  if (tx.to == address) {
    icon = VerticalAlignBottom;
  } else if (!tx.to) {
    icon = NoteAdd;
  }

  return <Badge>{createElement(icon, { color })}</Badge>;
}
