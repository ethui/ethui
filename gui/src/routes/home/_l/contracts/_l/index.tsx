import { Link, createFileRoute } from "@tanstack/react-router";
import debounce from "lodash-es/debounce";
import { useState } from "react";
import { useShallow } from "zustand/shallow";

import { Badge } from "@ethui/ui/components/shadcn/badge";
import { Button } from "@ethui/ui/components/shadcn/button";
import { Input } from "@ethui/ui/components/shadcn/input";
import { MoveRight, Plus } from "lucide-react";
import { AddressView } from "#/components/AddressView";
import { useContracts } from "#/store/useContracts";

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
          ({ address, name, chainId, proxyName }) => (
            <Link
              key={address}
              to="/home/contracts/$chainId/$address"
              params={{ address: address, chainId: chainId }}
              className="flex p-4 align-baseline hover:bg-accent"
            >
              <div className="flex items-center gap-2 ">
                <AddressView address={address} />
                {proxyName && (
                  <>
                    <Badge variant="secondary">{proxyName}</Badge>
                    <MoveRight strokeWidth={1} size={16} />
                  </>
                )}
                {name && <Badge variant="secondary">{name}</Badge>}
              </div>
            </Link>
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
