import {
  CallMade,
  CallReceived,
  ExpandMore,
  NoteAdd,
} from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Badge,
  Box,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { createElement, useCallback, useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroller";
import { useTransaction, useWaitForTransaction } from "wagmi";
import { waitForTransaction } from "wagmi/actions";

import { useProvider, useRefreshTransactions } from "../hooks";
import { useNetworks, useWallets } from "../store";
import { Address, Paginated, Pagination, Tx } from "../types";
import { AddressView, Panel } from "./";

export function Txs() {
  const account = useWallets((s) => s.address);
  const chainId = useNetworks((s) => s.current?.chain_id);

  const [pages, setPages] = useState<Paginated<Tx>[]>([]);

  const loadMore = useCallback(() => {
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
  }, [account, chainId, pages, setPages]);

  useEffect(() => {
    if (pages.length == 0) loadMore();
  }, [pages, loadMore]);

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
        {pages.flatMap((page) =>
          page.items.map((tx) => (
            <Accordion key={tx.hash}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Summary account={account} tx={tx} />
              </AccordionSummary>
              <AccordionDetails>
                <Details tx={tx} />
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </InfiniteScroll>
    </Panel>
  );
}

interface SummaryProps {
  account: Address;
  tx: Tx;
}
function Summary({ account, tx }: SummaryProps) {
  return (
    <Stack direction="row" spacing={1}>
      <Icon {...{ tx, account }} />
      <AddressView address={tx.from} /> <span>→</span>
      {tx.to ? (
        <AddressView address={tx.to} />
      ) : (
        <Typography component="span">Contract Deploy</Typography>
      )}
    </Stack>
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

interface DetailsProps {
  tx: Tx;
}

function Details({ tx }: DetailsProps) {
  const provider = useProvider();

  const { data: transaction } = useTransaction({ hash: tx.hash });
  const { data: receipt } = useWaitForTransaction({ hash: tx.hash });

  console.log(transaction, "asd", receipt, "asd");

  if (!receipt) return null;

  return (
    <>
      <Stack direction="column"></Stack>
      {transaction?.toString()}
      <br />
      {receipt?.toString()}
    </>
  );
}
