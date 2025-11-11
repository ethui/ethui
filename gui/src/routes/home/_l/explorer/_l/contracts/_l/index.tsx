import { Badge } from "@ethui/ui/components/shadcn/badge";
import { Button } from "@ethui/ui/components/shadcn/button";
import { Input } from "@ethui/ui/components/shadcn/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ethui/ui/components/shadcn/tooltip";
import { createFileRoute, Link } from "@tanstack/react-router";
import debounce from "lodash-es/debounce";
import { MoveRight, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import type { Abi, Address } from "viem";
import { useShallow } from "zustand/shallow";
import { AddressView } from "#/components/AddressView";
import { EmptyState } from "#/components/EmptyState";
import { useInvoke } from "#/hooks/useInvoke";
import { type OrganizedContract, useContracts } from "#/store/useContracts";

export const Route = createFileRoute("/home/_l/explorer/_l/contracts/_l/")({
  component: Contracts,
});

function Contracts() {
  const [filter, setFilter] = useState("");
  const contracts = useContracts(
    useShallow((s) => s.filteredContracts(filter)),
  );

  if (contracts.length === 0) {
    return (
      <EmptyState
        message="No contracts found"
        description="No contracts have been added yet. Make sure you have deployed contracts in your running node. Or in case of a live network, add a contract manually."
      />
    );
  }

  return (
    <>
      <Filter onChange={(f) => setFilter(f)} />

      <div className="flex flex-col gap-2 pt-2">
        {Array.from(contracts || []).map(
          ({ address, name, chainId, proxyChain }) => (
            <ContractHeader
              key={address}
              contract={{ address, name, chainId, proxyChain }}
            />
          ),
        )}
      </div>
    </>
  );
}

function Filter({ onChange }: { onChange: (f: string) => void }) {
  return (
    <form className="mx-2 flex items-center gap-1">
      <Input
        onChange={debounce((e) => onChange(e.target.value), 100)}
        placeholder="Filter..."
        className="h-10"
      />
    </form>
  );
}

function ContractHeader({ contract }: { contract: OrganizedContract }) {
  const { address, name, chainId, proxyChain } = contract;
  const { data: abi } = useInvoke<Abi>("db_get_contract_impl_abi", {
    address,
    chainId,
  });

  const hasAbi = abi && abi.length > 0;

  return (
    <div className="group flex w-full flex-nowrap overflow-hidden hover:bg-accent">
      <div className="mr-4 grow">
        <Link
          to="/home/explorer/contracts/$chainId/$address"
          params={{ address: address, chainId: chainId }}
          className="flex whitespace-nowrap p-4 align-baseline"
        >
          <div className="flex w-full items-center gap-2">
            <AddressView showLinkExplorer={false} address={address} />

            <div className="flex items-center gap-1">
              {name && (
                <Badge key={address} variant="secondary">
                  {name}
                </Badge>
              )}

              {proxyChain.map(({ address, name }) => (
                <div key={address} className="flex items-center gap-2">
                  <MoveRight strokeWidth={1} size={16} />
                  {name ? (
                    <Badge key={address} variant="secondary">
                      {name}
                    </Badge>
                  ) : (
                    <AddressView
                      address={address}
                      noTextStyle
                      showLinkExplorer={false}
                    />
                  )}
                </div>
              ))}

              {!hasAbi && (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="gap-1 border-yellow-600 text-yellow-600 dark:border-yellow-500 dark:text-yellow-500"
                      >
                        <TriangleAlert className="h-3 w-3" />
                        No ABI
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>No ABI found, check your foundry settings</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </Link>
      </div>

      <div className="flex min-w-[50px] items-center justify-end pr-2 group-hover:flex">
        <DeleteContractButton address={address} chainId={chainId} />
      </div>
    </div>
  );
}

interface DeleteContractButtonPropsProps {
  address: Address;
  chainId: number;
}

function DeleteContractButton({
  address,
  chainId,
}: DeleteContractButtonPropsProps) {
  const [deleting, setDeleting] = useState(false);
  const removeContract = useContracts((s) => s.removeContract);

  if (!deleting) {
    return (
      <Button
        key="delete"
        variant="ghost"
        className="h-13 w-12"
        onClick={() => setDeleting(true)}
      >
        <Trash2 />
      </Button>
    );
  } else {
    return (
      <div className="flex items-center justify-stretch">
        <Button
          key="delete-confirm"
          variant="destructive"
          className="flex"
          onClick={() => removeContract(chainId, address)}
          onMouseOut={() => setDeleting(false)}
          onBlur={() => setDeleting(false)}
        >
          Sure?
        </Button>
      </div>
    );
  }
}
