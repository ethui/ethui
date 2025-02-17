import { InfiniteScroll } from "@ethui/ui/components/infinite-scroll";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ethui/ui/components/shadcn/context-menu";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import * as tauriClipboard from "@tauri-apps/plugin-clipboard-manager";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Abi, type Address, formatEther, formatGwei } from "viem";

import type { PaginatedTx, Tx } from "@ethui/types";
import { BlockNumber } from "@ethui/ui/components/block-number";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ethui/ui/components/shadcn/accordion";
import { Button } from "@ethui/ui/components/shadcn/button";
import { SolidityCall } from "@ethui/ui/components/solidity-call";
import {
  LoaderCircle,
  MoveDownLeft,
  MoveUpRight,
  ReceiptText,
} from "lucide-react";
import { AddressView } from "#/components/AddressView";
import { Datapoint } from "#/components/Datapoint";
import { HashView } from "#/components/HashView";
import { useEventListener } from "#/hooks/useEventListener";
import { useInvoke } from "#/hooks/useInvoke";
import { useNetworks } from "#/store/useNetworks";
import { useWallets } from "#/store/useWallets";

export const Route = createFileRoute("/home/_l/transactions")({
  beforeLoad: () => ({ breadcrumb: "Transactions" }),
  component: Txs,
});

function Txs() {
  const account = useWallets((s) => s.address);
  const chainId = useNetworks((s) => s.current?.chain_id);

  const [items, setItems] = useState<PaginatedTx[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  let lastKnown = null;
  if (items.at(-1)) {
    lastKnown = {
      blockNumber: items.at(-1)?.blockNumber,
      position: items.at(-1)?.position,
    };
  }

  const next = useCallback(async () => {
    setLoading(true);
    console.log("next");

    invoke<PaginatedTx[]>("db_get_next_transactions", {
      address: account,
      chainId,
      lastKnown,
    }).then((newItems) => {
      console.log(newItems);
      setItems([...items, ...newItems]);
      setLoading(false);
    });
  }, [account, chainId, items, lastKnown]);

  const hasMore = false; //TODO!pages.at(-1)?.last;

  const loadNew = () => {
    invoke("db_get_new_transactions", {
      address: account,
      chainId,
      lastKnown,
    });
    setItems([]);
  };

  useEventListener("txs-updated", loadNew);

  // biome-ignore lint/correctness/useExhaustiveDependencies(account): used only to trigger effect
  // biome-ignore lint/correctness/useExhaustiveDependencies(chainId): used only to trigger effect
  useEffect(() => {
    setItems([]);
  }, [account, chainId]);

  if (!account || !chainId) return null;

  return (
    <div className="flex w-full flex-col items-center gap-2" ref={wrapperRef}>
      <Accordion type="multiple" className="w-full">
        {items.map((tx, i) => (
          <AccordionItem key={`${tx.hash} ${i}`} value={tx.hash}>
            <AccordionTrigger>
              <Summary account={account} tx={tx} />
            </AccordionTrigger>
            <AccordionContent>
              <Details tx={tx} chainId={chainId} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <InfiniteScroll
        next={next}
        isLoading={loading}
        hasMore={hasMore}
        threshold={0.5}
        root={wrapperRef.current}
      >
        {hasMore && <LoaderCircle className="animate-spin" />}
      </InfiniteScroll>
    </div>
  );
}

interface SummaryProps {
  account: Address;
  tx: PaginatedTx;
}
function Summary({ account, tx }: SummaryProps) {
  return (
    <div className="flex items-center gap-x-3">
      <Icon {...{ tx, account }} />
      <BlockNumber number={tx.blockNumber} />
      <AddressView address={tx.from} /> <span>→</span>
      {tx.to ? <AddressView address={tx.to} /> : <span>Contract Deploy</span>}
    </div>
  );
}

interface IconProps {
  account: Address;
  tx: PaginatedTx;
}

function Icon({ account, tx }: IconProps) {
  if (!tx.to) {
    return <ReceiptText size={15} />;
  } else if (tx.to.toLowerCase() === account.toLowerCase()) {
    return <MoveDownLeft size={15} />;
  } else {
    return <MoveUpRight size={15} />;
  }
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

  const { data: abi } = useInvoke<Abi>("db_get_contract_abi", {
    address: tx.to,
    chainId,
  });

  const value = BigInt(fullTx?.value || 0);

  return (
    <div className="grid grid-cols-4 gap-5">
      <Datapoint
        className="col-span-2"
        label="from"
        value={<AddressView icon address={tx.from} />}
      />
      <Datapoint
        className="col-span-2"
        label="to"
        value={tx.to ? <AddressView icon address={tx.to} /> : ""}
      />
      <Datapoint
        label="value"
        value={
          <ContextMenu>
            <ContextMenuTrigger>{formatEther(value)} Ξ</ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                onClick={() => tauriClipboard.writeText(value.toString())}
              >
                Copy to clipboard
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        }
      />
      <Datapoint label="Block #" value={fullTx?.blockNumber?.toString()} />
      <Datapoint label="hash" value={<HashView hash={tx.hash} />} />
      <Datapoint label="nonce" value={fullTx?.nonce} />

      <Datapoint
        label="data"
        className="col-span-4"
        value={
          fullTx && (
            <SolidityCall
              value={value}
              data={fullTx.data}
              from={tx.from}
              to={tx.to}
              chainId={chainId}
              abi={abi}
              ArgProps={{ addressRenderer: (a) => <AddressView address={a} /> }}
            />
          )
        }
      />
      <Datapoint label="type" value={formatTxType(fullTx?.type)} />
      {/* TODO: other txs types */}
      {fullTx?.type === 2 && (
        <>
          <Datapoint
            label="maxFeePerGas"
            value={`${fullTx.maxFeePerGas && formatGwei(BigInt(fullTx.maxFeePerGas))} gwei`}
          />
          <Datapoint
            label="maxPriorityFeePerGas"
            value={`${fullTx.maxPriorityFeePerGas && formatGwei(BigInt(fullTx.maxPriorityFeePerGas))} gwei`}
          />
        </>
      )}
      <Datapoint
        label="gasLimit"
        value={
          fullTx?.gasLimit && `${formatGwei(BigInt(fullTx.gasLimit))} gwei`
        }
      />
      <Datapoint
        label="gasUsed"
        value={fullTx?.gasUsed && `${formatGwei(BigInt(fullTx.gasUsed))} gwei`}
      />

      <div className="col-start-1">
        <Button
          className="col-start-1"
          onClick={() => fullTx && resend(fullTx)}
        >
          Send again
        </Button>
      </div>
    </div>
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
