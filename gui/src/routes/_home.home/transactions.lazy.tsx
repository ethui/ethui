import { CallMade, CallReceived, NoteAdd } from "@mui/icons-material";
import {
  Badge,
  Box,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api";
import { createElement, useCallback, useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroller";
import truncateEthAddress from "truncate-eth-address";
import { Abi, Address, formatEther, formatGwei } from "viem";
import { useTransaction, useTransactionReceipt } from "wagmi";
import { createLazyFileRoute } from "@tanstack/react-router";

import { Paginated, PaginatedTx, Pagination, Tx } from "@iron/types";
import { SolidityCall } from "@iron/react/components";
import { useEventListener, useInvoke } from "@/hooks";
import { useNetworks, useWallets } from "@/store";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  AddressView,
  ContextMenuWithTauri,
} from "@/components";
import { Datapoint } from "@/components/Datapoint";
import { Navbar } from "@/components/Home/Navbar";

export const Route = createLazyFileRoute("/_home/home/transactions")({
  component: Txs,
});

export function Txs() {
  const account = useWallets((s) => s.address);
  const chainId = useNetworks((s) => s.current?.chain_id);

  const [pages, setPages] = useState<Paginated<PaginatedTx>[]>([]);

  const loadMore = useCallback(() => {
    let pagination: Pagination = {};
    const last = pages?.at(-1)?.pagination;
    if (!!last) {
      pagination = last;
      pagination.page = (pagination.page || 0) + 1;
    }

    invoke<Paginated<PaginatedTx>>("db_get_transactions", {
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

  if (!account || !chainId) return null;

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
    <>
      <Navbar>Transactions</Navbar>
      <InfiniteScroll
        loadMore={loadMore}
        hasMore={!pages.at(-1)?.last}
        loader={loader}
      >
        {pages.flatMap((page) =>
          page.items.map((tx) => (
            <Accordion key={tx.hash}>
              <AccordionSummary>
                <Summary account={account} tx={tx} />
              </AccordionSummary>
              <AccordionDetails>
                <Details tx={tx} chainId={chainId} />
              </AccordionDetails>
            </Accordion>
          )),
        )}
      </InfiniteScroll>
    </>
  );
}

interface SummaryProps {
  account: Address;
  tx: PaginatedTx;
}
function Summary({ account, tx }: SummaryProps) {
  return (
    <Stack direction="row" spacing={1}>
      <Icon {...{ tx, account }} />
      <AddressView address={tx.from} /> <span>→</span>
      {tx.to ? (
        <AddressView address={tx.to} tokenIcon />
      ) : (
        <Typography component="span">Contract Deploy</Typography>
      )}
    </Stack>
  );
}

interface IconProps {
  account: Address;
  tx: PaginatedTx;
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
  tx: PaginatedTx;
  chainId: number;
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unreachable code error
BigInt.prototype.toJSON = function (): string {
  return this.toString();
};

function Details({ tx, chainId }: DetailsProps) {
  const { data: fullTx } = useInvoke<Tx>("db_get_transaction_by_hash", {
    hash: tx.hash,
    chainId,
  });
  const { data: transaction } = useTransaction({ hash: tx.hash, chainId });
  const { data: receipt } = useTransactionReceipt({ hash: tx.hash, chainId });
  const { data: abi } = useInvoke<Abi>("get_contract_abi", {
    address: tx.to,
    chainId,
  });

  if (!fullTx) return null;

  const value = fullTx.value ? BigInt(fullTx.value) : undefined;

  return (
    <Grid container rowSpacing={1}>
      <Datapoint
        label="from"
        value={<AddressView address={tx.from} />}
        size="small"
      />
      <Datapoint
        label="to"
        value={tx.to ? <AddressView tokenIcon address={tx.to} /> : ""}
        size="small"
      />
      <Datapoint
        label="value"
        value={
          value ? (
            <ContextMenuWithTauri copy={value}>
              {formatEther(value)} Ξ
            </ContextMenuWithTauri>
          ) : null
        }
        size="small"
      />
      <Datapoint
        label="Block #"
        value={receipt && receipt.blockNumber.toString()}
        size="small"
      />
      <Datapoint
        label="hash"
        value={truncateEthAddress(tx.hash)}
        size="small"
      />
      <Datapoint label="nonce" value={transaction?.nonce} size="small" />
      <Datapoint
        label="data"
        value={
          transaction && (
            <SolidityCall
              value={value}
              data={transaction.input}
              from={tx.from}
              to={tx.to}
              chainId={chainId}
              abi={abi}
              ArgProps={{ addressRenderer: (a) => <AddressView address={a} /> }}
            />
          )
        }
      />
      <Datapoint label="type" value={transaction?.type} size="small" />
      {/* TODO: other txs types */}
      {transaction?.type == "eip1559" && (
        <>
          <Datapoint
            label="maxFeePerGas"
            value={`${formatGwei(transaction.maxFeePerGas)} gwei`}
            size="small"
          />
          <Datapoint
            label="maxPriorityFeePerGas"
            value={`${formatGwei(transaction.maxPriorityFeePerGas)} gwei`}
            size="small"
          />
        </>
      )}
      <Datapoint
        label="gasLimit"
        value={transaction && `${formatGwei(transaction?.gas)} gwei`}
        size="small"
      />
      <Datapoint
        label="gasUsed"
        value={receipt && `${formatGwei(receipt?.gasUsed)} gwei`}
        size="medium"
      />
    </Grid>
  );
}
