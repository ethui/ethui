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
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { createElement, useCallback, useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroller";
import truncateEthAddress from "truncate-eth-address";
import { formatEther, formatGwei } from "viem";
import { useTransaction, useWaitForTransaction } from "wagmi";

import { useEventListener } from "../hooks";
import { useNetworks, useWallets } from "../store";
import { Address, Paginated, Pagination, Tx } from "../types";
import { AddressView, ContextMenu, MonoText, Panel } from "./";

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

  useEventListener("txs-updated", reload);
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
          )),
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
  const { data: transaction } = useTransaction({ hash: tx.hash });
  const { data: receipt } = useWaitForTransaction({ hash: tx.hash });

  if (!receipt || !transaction) return null;

  return (
    <Grid container rowSpacing={2}>
      <Datapoint label="hash" value={truncateEthAddress(tx.hash)} />
      <Datapoint label="from" value={<AddressView address={tx.from} />} short />
      <Datapoint
        label="to"
        value={tx.to ? <AddressView address={tx.to} /> : ""}
        short
      />
      <Datapoint
        label="value"
        value={<ContextMenu>{formatEther(BigInt(tx.value))} Ξ</ContextMenu>}
      />
      <Datapoint
        label="data"
        value={<MonoText>{transaction.input}</MonoText>}
        mono
      />
      <Datapoint label="nonce" value={transaction.nonce} />
      <Datapoint label="type" value={transaction.type} />
      {/* TODO: other txs types */}
      {transaction.type == "eip1559" && (
        <>
          <Datapoint
            label="maxFeePerGas"
            value={`${formatGwei(transaction.maxFeePerGas)} gwei`}
            short
          />
          <Datapoint
            label="maxPriorityFeePerGas"
            value={`${formatGwei(transaction.maxPriorityFeePerGas)} gwei`}
            short
          />
        </>
      )}
      <Datapoint
        label="gasLimit"
        value={`${formatGwei(transaction.gas)} gwei`}
        short
      />
      <Datapoint
        label="gasUsed"
        value={`${formatGwei(receipt.gasUsed)} gwei`}
        short
      />
    </Grid>
  );
}

interface DatapointProps {
  label: string;
  value: React.ReactNode;
  short: boolean;
  mono: boolean;
}

const monoStyle = {
  overflowWrap: "break-word",
  fontFamily: "monospace",
};

function Datapoint({ label, value, short, mono }: DatapointProps) {
  return (
    <Grid item xs={short ? 6 : 12}>
      <Typography color="gray" sx={{ fontSize: "12px" }}>
        {label}
      </Typography>
      {value}
    </Grid>
  );
}

Datapoint.defaultProps = {
  short: false,
  mono: false,
};
