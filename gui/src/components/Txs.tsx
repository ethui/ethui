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
import { useTransaction, useWaitForTransaction } from "wagmi";

import { Paginated, Pagination, Tx } from "@iron/types";
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
import { Datapoint } from "./Datapoint";

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
  chainId: number;
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unreachable code error
BigInt.prototype.toJSON = function (): string {
  return this.toString();
};

function Details({ tx, chainId }: DetailsProps) {
  const { data: transaction } = useTransaction({ hash: tx.hash });
  const { data: receipt } = useWaitForTransaction({ hash: tx.hash });
  const { data: abi } = useInvoke<Abi>("get_contract_abi", {
    address: tx.to,
    chainId,
  });

  return (
    <Grid container rowSpacing={1}>
      <Datapoint
        label="from"
        value={<AddressView address={tx.from} />}
        size="medium"
      />
      <Datapoint
        label="to"
        value={tx.to ? <AddressView address={tx.to} /> : ""}
        size="medium"
      />
      <Datapoint
        label="hash"
        value={truncateEthAddress(tx.hash)}
        size="small"
      />
      <Datapoint label="nonce" value={transaction?.nonce} size="small" />
      <Datapoint
        label="value"
        value={
          <ContextMenuWithTauri copy={BigInt(tx.value)}>
            {formatEther(BigInt(tx.value))} Ξ
          </ContextMenuWithTauri>
        }
        size="small"
      />
      <Datapoint
        label="data"
        value={
          transaction && (
            <SolidityCall
              value={BigInt(tx.value)}
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
        size="medium"
      />
      <Datapoint
        label="gasUsed"
        value={receipt && `${formatGwei(receipt?.gasUsed)} gwei`}
        size="medium"
      />
    </Grid>
  );
}
