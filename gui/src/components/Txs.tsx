import {
  type TransactionReceipt,
  type TransactionResponse,
} from "@ethersproject/providers";
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
import { formatEther } from "ethers/lib/utils";
import { createElement } from "react";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { listen } from "@tauri-apps/api/event";
import { formatEther } from "ethers/lib/utils";
import { useEffect } from "react";
import useSWR from "swr";
import truncateEthAddress from "truncate-eth-address";
import { type TransactionReceipt, formatEther } from "viem";

import { useAccount, useClient } from "../hooks";
import { useInvoke } from "../hooks/tauri";
import { useRefreshTransactions } from "../hooks/useRefreshTransactions";
import { Address } from "../types";
import { ContextMenu } from "./ContextMenu";
import Panel from "./Panel";

export function Txs() {
  const account = useAccount();
  const { data: hashes, mutate } = useInvoke<string[]>("db_get_transactions", {
    address: account,
  });

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
  hash: string;
}

function Receipt({ account, hash }: ReceiptProps) {
  const provider = useProvider();
  const client = useClient();

  const { data: tx, mutate: mutate1 } = useSWR(
    !!client && ["getTransaction", hash],
    ([, hash]) => client?.getTransaction({ hash: `0x${hash}` })
  );

  const { data: receipt, mutate: mutate2 } = useSWR(
    !!client && ["getTransactionReceipt", hash],
    ([, hash]) => client?.getTransactionReceipt({ hash: `0x${hash}` })
  );

  useEffect(() => {
    mutate1();
    mutate2();
  }, [client, mutate1, mutate2]);

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

interface IconProps {
  account: Address;
  receipt: TransactionReceipt;
  tx: TransactionResponse;
}

function Icon({ account, receipt, tx }: IconProps) {
  const color = receipt.status === 1 ? "success" : "error";

  let icon = CallMade;

  if (tx.to == account) {
    icon = VerticalAlignBottom;
  } else if (!tx.to) {
    icon = NoteAdd;
  }

  return <Badge>{createElement(icon, { color })}</Badge>;
}

