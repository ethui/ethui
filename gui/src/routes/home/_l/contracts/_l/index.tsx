import { Link, createFileRoute } from "@tanstack/react-router";
import debounce from "lodash-es/debounce";
import { Fragment, useState } from "react";
import { useShallow } from "zustand/shallow";

import { Badge } from "@ethui/ui/components/shadcn/badge";
import { Button } from "@ethui/ui/components/shadcn/button";
import { Input } from "@ethui/ui/components/shadcn/input";
import { MoveRight, Plus, Trash2 } from "lucide-react";
import type { Address } from "viem";
import { AddressView } from "#/components/AddressView";
import { type OrganizedContract, useContracts } from "#/store/useContracts";

export const Route = createFileRoute("/home/_l/contracts/_l/")({
  component: Contracts,
});

function Contracts() {
  const [filter, setFilter] = useState("");
  const [pendingDeleteContract, setPendingDeleteContract] = useState<
    `0x${string}` | null
  >(null);
  const contracts = useContracts(
    useShallow((s) => s.filteredContracts(filter)),
  );

  const removeContract = useContracts((s) => s.removeContract);

  const startRemoveContract = (address: Address) => {
    setPendingDeleteContract(address);
  };

  return (
    <>
      <Filter onChange={(f) => setFilter(f)} />

      <div className="flex flex-col gap-2 pt-2">
        {Array.from(contracts || []).map(
          ({ address, name, chainId, proxyChain }) => (
            <div key={address} className="flex hover:bg-accent">
              <ContractHeader
                contract={{ address, name, chainId, proxyChain }}
              />
              {(!pendingDeleteContract ||
                pendingDeleteContract !== address) && (
                <div className="flex flex-row items-start">
                  <Button
                    variant="ghost"
                    className="h-13 w-12"
                    onClick={() => startRemoveContract(address)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              )}

              {pendingDeleteContract && pendingDeleteContract === address && (
                <div className="flex items-center">
                  <span className="flex whitespace-nowrap p-4 text-sm">
                    Delete contract?
                  </span>
                  <Button
                    className="flex h-10 w-12 p-4"
                    onClick={() => removeContract(chainId, address)}
                  >
                    yes
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex h-10 w-24 text-sm hover:bg-transparent"
                    onClick={() => setPendingDeleteContract(null)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
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
    <div className="grow">
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
                  {name ? name : <AddressView address={address} noTextStyle />}
                </Badge>
              </Fragment>
            ))}
          </div>
        </div>
      </Link>
    </div>
  );
}
