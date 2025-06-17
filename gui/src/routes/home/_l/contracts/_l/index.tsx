import { Badge } from "@ethui/ui/components/shadcn/badge";
import { Button } from "@ethui/ui/components/shadcn/button";
import { Input } from "@ethui/ui/components/shadcn/input";
import { createFileRoute, Link } from "@tanstack/react-router";
import debounce from "lodash-es/debounce";
import { MoveRight, Plus, Trash2 } from "lucide-react";
import { Fragment, useState } from "react";
import type { Address } from "viem";
import { useShallow } from "zustand/shallow";
import { AddressView } from "#/components/AddressView";
import { type OrganizedContract, useContracts } from "#/store/useContracts";

export const Route = createFileRoute("/home/_l/contracts/_l/")({
  component: Contracts,
});

function Contracts() {
  const [filter, setFilter] = useState("");
  const contracts = useContracts(
    useShallow((s) => s.filteredContracts(filter)),
  );

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

      <Link to="/home/contracts/add">
        <Button size="icon" className="fixed right-6 bottom-6">
          <Plus />
        </Button>
      </Link>
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

  return (
    <div className="group flex w-full flex-nowrap overflow-hidden hover:bg-accent">
      <div className="mr-4 grow">
        <Link
          to="/home/contracts/$chainId/$address"
          params={{ address: address, chainId: chainId }}
          className="flex whitespace-nowrap p-4 align-baseline"
        >
          <div className="flex w-full items-center gap-2">
            <AddressView address={address} />

            <div className="flex items-center">
              {name && (
                <Badge key={address} variant="secondary">
                  {name}
                </Badge>
              )}

              {proxyChain.map(({ address, name }) => (
                <Fragment key={address}>
                  <MoveRight strokeWidth={1} size={16} />
                  <Badge key={address} variant="secondary">
                    {name ? (
                      name
                    ) : (
                      <AddressView address={address} noTextStyle />
                    )}
                  </Badge>
                </Fragment>
              ))}
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
