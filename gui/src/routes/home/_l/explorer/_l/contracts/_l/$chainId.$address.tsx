import { ContractExecutionTabs } from "@ethui/ui/components/contract-execution/contract-execution-tabs/index.js";
import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { type Abi, type Address, getAddress, type Hash } from "viem";
import { AddressView } from "#/components/AddressView";
import { EmptyState } from "#/components/EmptyState";
import { useAllAddresses } from "#/hooks/useAllAddresses";
import { useInvoke } from "#/hooks/useInvoke";
import { useWallets } from "#/store/useWallets";

export const Route = createFileRoute(
  "/home/_l/explorer/_l/contracts/_l/$chainId/$address",
)({
  beforeLoad: ({ params }) => ({
    breadcrumb: { type: "address", value: params.address },
  }),
  loader: ({ params }: { params: { chainId: number; address: Address } }) => ({
    chainId: Number(params.chainId),
    address: getAddress(params.address),
  }),
  component: ContractInteraction,
});

function ContractInteraction() {
  const { chainId, address } = Route.useLoaderData();
  const navigate = useNavigate();
  const sender = useWallets((s) => s.address);
  const { data: addresses } = useAllAddresses();
  const { data: abi } = useInvoke<Abi>("db_get_contract_impl_abi", {
    address,
    chainId,
  });

  return (
    <ContractExecutionTabs
      abi={abi ?? []}
      address={address}
      chainId={chainId}
      addresses={addresses?.all ?? []}
      isConnected={!!sender}
      onQuery={async ({ callData, value }) =>
        invoke<Hash>("rpc_eth_call", {
          params: {
            data: callData,
            value: value?.toString(),
            to: address,
          },
        })
      }
      onSimulate={async ({ callData, value }) =>
        invoke<Hash>("rpc_eth_call", {
          params: {
            data: callData,
            value: value?.toString(),
            to: address,
          },
        })
      }
      onWrite={async ({ callData, value, msgSender }) =>
        invoke<Hash>("rpc_send_transaction", {
          params: {
            data: callData,
            from: msgSender,
            to: address,
            value: value?.toString() || "0",
          },
        })
      }
      addressRenderer={(addr: Address) => (
        <AddressView address={addr} showLinkExplorer={false} />
      )}
      onHashClick={(hash: string) => {
        navigate({
          to: "/home/explorer/transactions/$transaction",
          params: { transaction: hash },
        });
      }}
      NoAbiComponent={NoAbiComponent}
    />
  );
}

function NoAbiComponent() {
  return (
    <EmptyState
      message="No ABI found"
      description="Check if the contract ABI is included in the foundry path on settings"
      className="mt-20"
    >
      <Link to="/home/settings/foundry">
        <Button>Go to Settings</Button>
      </Link>
    </EmptyState>
  );
}
