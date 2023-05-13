import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from "@mui/material";
import { green, red } from "@mui/material/colors";
import { formatEther } from "ethers/lib/utils";
import React from "react";
import { useEffect } from "react";
import useSWR from "swr";
import truncateEthAddress from "truncate-eth-address";

import { useAccount, useProvider } from "../hooks";
import { useInvoke } from "../hooks/tauri";
import { useRefreshTransactions } from "../hooks/useRefreshTransactions";
import Panel from "./Panel";

export function Txs() {
  const account = useAccount();
  const { data: hashes, mutate } = useInvoke<string[]>("get_transactions", {
    address: account,
  });

  useRefreshTransactions(mutate);

  return (
    <Panel>
      <List dense>
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

  return (
    <ListItem disablePadding alignItems="flex-start">
      <ListItemAvatar sx={{ minWidth: 32 }}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "100%",
            mt: 1,
            background: receipt.status === 1 ? green[500] : red[500],
          }}
        ></Box>
      </ListItemAvatar>
      <ListItemText
        primary={hash}
        secondary={
          <>
            <Box>From: {truncateEthAddress(receipt.from)}</Box>
            <Box>
              To:{" "}
              {receipt.to ? truncateEthAddress(receipt.to) : "Contract Deploy"}
            </Box>
            <Box>Amount: {formatEther(tx.value)} Ξ</Box>
          </>
        }
      />
    </ListItem>
  );
}
