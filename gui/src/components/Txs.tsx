import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  Stack,
  Typography,
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
import { ContextMenu } from "./ContextMenu";
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
            background: receipt.status === 1 ? green[500] : red[500],
          }}
        ></Box>
      </ListItemAvatar>
      <Stack mb={1}>
        <ContextMenu>
          <Typography sx={{ textTransform: "none" }}>{hash}</Typography>
        </ContextMenu>
        <Box sx={{ fontSize: 12 }}>
          <Box>
            From:{" "}
            <ContextMenu label={receipt.from} sx={{ textTransform: "none" }}>
              {truncateEthAddress(receipt.from)}
            </ContextMenu>
          </Box>
          <Box>
            To:{" "}
            {receipt.to ? (
              <ContextMenu label={receipt.to} sx={{ textTransform: "none" }}>
                {truncateEthAddress(receipt.to)}
              </ContextMenu>
            ) : (
              "Contract Deploy"
            )}
          </Box>
          <Box>
            Amount: <ContextMenu>{formatEther(tx.value)}</ContextMenu> Ξ
          </Box>
        </Box>
      </Stack>
    </ListItem>
  );
}
