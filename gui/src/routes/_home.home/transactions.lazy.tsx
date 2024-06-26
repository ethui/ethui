import { CallMade, CallReceived, NoteAdd } from "@mui/icons-material";
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { createElement, useCallback, useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroller";
import { Abi, Address, formatEther, formatGwei } from "viem";
import { createFileRoute } from "@tanstack/react-router";

import { BlockNumber, SolidityCall } from "@ethui/react/components";
import { Paginated, PaginatedTx, Pagination, Tx } from "@ethui/types";
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
import { HashView } from "@/components/HashView";

export const Route = createFileRoute("/_home/home/transactions")({
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
    <Stack direction="row" alignItems="center" spacing={3}>
      <Icon {...{ tx, account }} />

      <BlockNumber number={tx.blockNumber} />
      <Stack direction="row" alignItems="center" spacing={1}>
        <AddressView address={tx.from} /> <span>→</span>
        {tx.to ? (
          <AddressView address={tx.to} />
        ) : (
          <Typography component="span">Contract Deploy</Typography>
        )}
      </Stack>
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
  // const { data: transaction } = useTransaction({ hash: tx.hash, chainId });
  const { data: abi } = useInvoke<Abi>("db_get_contract_abi", {
    address: tx.to,
    chainId,
  });

  if (!fullTx) return null;

  const value = BigInt(fullTx.value || 0);

  return (
    <Grid container rowSpacing={1}>
      <Datapoint
        label="from"
        value={<AddressView icon address={tx.from} />}
        size="small"
      />
      <Datapoint
        label="to"
        value={tx.to ? <AddressView icon address={tx.to} /> : ""}
        size="small"
      />
      <Datapoint
        label="value"
        value={
          <ContextMenuWithTauri copy={value}>
            {formatEther(value)} Ξ
          </ContextMenuWithTauri>
        }
        size="small"
      />
      <Datapoint
        label="Block #"
        value={fullTx?.blockNumber?.toString()}
        size="small"
      />
      <Datapoint
        label="hash"
        value={<HashView hash={tx.hash} />}
        size="small"
      />
      <Datapoint label="nonce" value={fullTx.nonce} size="small" />
      <Datapoint
        label="data"
        value={
          <SolidityCall
            value={value}
            data={fullTx.data}
            from={tx.from}
            to={tx.to}
            chainId={chainId}
            abi={abi}
            ArgProps={{ addressRenderer: (a) => <AddressView address={a} /> }}
          />
        }
      />
      <Datapoint label="type" value={formatTxType(fullTx?.type)} size="small" />
      {/* TODO: other txs types */}
      {fullTx?.type == 2 && (
        <>
          <Datapoint
            label="maxFeePerGas"
            value={`${fullTx.maxFeePerGas && formatGwei(BigInt(fullTx.maxFeePerGas))} gwei`}
            size="small"
          />
          <Datapoint
            label="maxPriorityFeePerGas"
            value={`${fullTx.maxPriorityFeePerGas && formatGwei(BigInt(fullTx.maxPriorityFeePerGas))} gwei`}
            size="small"
          />
        </>
      )}
      <Datapoint
        label="gasLimit"
        value={fullTx.gasLimit && `${formatGwei(BigInt(fullTx.gasLimit))} gwei`}
        size="small"
      />
      <Datapoint
        label="gasUsed"
        value={fullTx.gasUsed && `${formatGwei(BigInt(fullTx.gasUsed))} gwei`}
        size="medium"
      />

      <Grid item xs={12}>
        <Button variant="contained" onClick={() => resend(fullTx)}>
          Send again
        </Button>
      </Grid>
    </Grid>
  );
}

function resend({ from, to, value, data }: Tx) {
  invoke<string>("rpc_send_transaction", {
    params: { from, to, value, data },
  });
}

function formatTxType(type: number | undefined): import("react").ReactNode {
  switch (type) {
    case 0:
      return "Legacy";
    case 1:
      return "EIP-1559";
    case 2:
      return "EIP-2930";
    case 3:
      return "EIP-4844";
  }
}
