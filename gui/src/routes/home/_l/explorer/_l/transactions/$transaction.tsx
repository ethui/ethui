import type { Tx } from "@ethui/types";
import { Badge } from "@ethui/ui/components/shadcn/badge";
import { Button } from "@ethui/ui/components/shadcn/button";
import { SolidityCall } from "@ethui/ui/components/solidity-call";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import type { ReactNode } from "react";
import { type Abi, formatEther } from "viem";
import { AddressView } from "#/components/AddressView";
import { HashView } from "#/components/HashView";
import { useInvoke } from "#/hooks/useInvoke";
import { useNetworks } from "#/store/useNetworks";
import { formatTxType } from "#/utils";

export const Route = createFileRoute(
  "/home/_l/explorer/_l/transactions/$transaction",
)({
  beforeLoad: ({ params }) => {
    return {
      breadcrumb: params.transaction,
    };
  },
  component: RouteComponent,
});

interface DetailRowProps {
  label: string;
  children: ReactNode;
}

function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-1/4 flex-shrink-0 text-muted-foreground text-sm">
        {label}:
      </span>
      <span className="font-mono">{children}</span>
    </div>
  );
}

function RouteComponent() {
  const { transaction } = Route.useParams();
  const chainId = useNetworks((s) => s.current?.dedup_chain_id.chain_id);
  const { data: fullTx } = useInvoke<Tx>("db_get_transaction_by_hash", {
    hash: transaction,
    chainId,
  });

  const { data: abi } = useInvoke<Abi>("db_get_contract_abi", {
    address: fullTx?.to,
    chainId,
  });

  if (!fullTx) {
    return null;
  }

  const value = BigInt(fullTx.value || 0);
  const gasUsed = BigInt(fullTx.gasUsed || 0);
  const maxFeePerGas = BigInt(fullTx.maxFeePerGas || 0);
  const transactionFee = gasUsed * maxFeePerGas;

  const resend = () => {
    invoke<string>("rpc_send_transaction", {
      params: {
        from: fullTx.from,
        to: fullTx.to,
        value: fullTx.value,
        data: fullTx.data,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <DetailRow label="Transaction Hash">
          <HashView showLinkExplorer={true} hash={fullTx.hash} />
        </DetailRow>

        <DetailRow label="Status">
          <Badge variant={fullTx.status === 1 ? "success" : "destructive"}>
            {fullTx.status === 1 ? "Success" : "Failed"}
          </Badge>
        </DetailRow>

        <DetailRow label="Block">{fullTx.blockNumber}</DetailRow>

        <DetailRow label="From">
          <AddressView
            showTypeIcon={true}
            showLinkExplorer={true}
            address={fullTx.from}
          />
        </DetailRow>

        <DetailRow label="To">
          {fullTx.to ? (
            <AddressView
              showTypeIcon={true}
              showLinkExplorer={true}
              address={fullTx.to}
            />
          ) : (
            <span className="text-muted-foreground text-sm">
              Contract Creation
            </span>
          )}
        </DetailRow>

        <DetailRow label="Value">{formatEther(value)} ETH</DetailRow>

        <DetailRow label="Transaction Fee">
          {formatEther(transactionFee)} ETH
        </DetailRow>

        <DetailRow label="Gas Price">{formatEther(maxFeePerGas)} ETH</DetailRow>

        <DetailRow label="Nonce">{fullTx.nonce}</DetailRow>

        <DetailRow label="Transaction Type">
          <Badge variant="secondary" className="bg-muted">
            {formatTxType(fullTx.type)}
          </Badge>
        </DetailRow>

        <div className="space-y-2">
          <span className="text-muted-foreground text-sm">Input Data:</span>
          <SolidityCall
            value={value}
            data={fullTx.data}
            from={fullTx.from}
            to={fullTx.to}
            chainId={chainId}
            abi={abi}
            ArgProps={{ addressRenderer: (a) => <AddressView address={a} /> }}
          />
        </div>

        <div className="flex justify-start pt-4">
          <Button onClick={resend}>Send again</Button>
        </div>
      </div>
    </div>
  );
}
