import { CallMade, CallReceived, NoteAdd } from "@mui/icons-material";
import {
  Badge,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  Stack,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { createElement, useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroller";
import { formatEther } from "viem";

import { useRefreshTransactions } from "../hooks";
import { useNetworks, useWallets } from "../store";
import { Address, Paginated, Pagination, Tx } from "../types";
import { AddressView, ContextMenu, Panel } from "./";

export function Txs() {
  const account = useWallets((s) => s.address);
  const chainId = useNetworks((s) => s.current?.chain_id);

  const [pages, setPages] = useState<Paginated<Tx>[]>([]);

  const loadMore = () => {
    let pagination: Pagination = {};
    const last = pages?.at(-1)?.pagination;
    if (!!last) {
      pagination = last;
      pagination.page = (pagination.page || 0) + 1;
    }

    invoke<Paginated<Tx>>("db_get_transactions", {
      address: account,
      chainId,
      pagination,
    }).then((page) => setPages([...pages, page]));
  };

  useEffect(() => {
    if (pages.length == 0) loadMore();
  }, [pages]);

  const reload = () => {
    setPages([]);
  };

  useRefreshTransactions(reload);
  useEffect(reload, [account, chainId]);

  if (!account) return null;

  const loader = (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
      }}
      key="loader"
    >
      <CircularProgress />
    </Box>
  );

  return (
    <Panel>
      <InfiniteScroll
        loadMore={loadMore}
        hasMore={!pages.at(-1)?.last}
        loader={loader}
      >
        <List key={"list"}>
          {pages.flatMap((page) =>
            page.items.map((tx) => (
              <Receipt account={account} tx={tx} key={tx.hash} />
            ))
          )}
        </List>
      </InfiniteScroll>
    </Panel>
  );
}

interface ReceiptProps {
  account: Address;
  tx: Tx;
}

function Receipt({ account, tx }: ReceiptProps) {
  const value = BigInt(tx.value);

  return (
    <ListItem>
      <ListItemAvatar>
        <Icon {...{ tx, account }} />
      </ListItemAvatar>
      <Box sx={{ flexGrow: 1 }}>
        <Stack>
          <Stack direction="row" spacing={1}>
            <AddressView address={tx.from} /> <span>→</span>
            {tx.to ? (
              <AddressView address={tx.to} />
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
  tx: Tx;
}

function Icon({ account, tx }: IconProps) {
  const color = tx.status === 1 ? "success" : "error";

  let icon = CallMade;

  if (!tx.to) {
    icon = NoteAdd;
  } else if (tx.to.toLowerCase() == account.toLowerCase()) {
    icon = CallReceived;
  }

  return <Badge>{createElement(icon, { color })}</Badge>;
}
