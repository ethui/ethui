import { Link, createFileRoute } from "@tanstack/react-router";
import debounce from "lodash-es/debounce";
import { useState } from "react";
import { useShallow } from "zustand/shallow";

import { Badge } from "@ethui/ui/components/shadcn/badge";
import { Button } from "@ethui/ui/components/shadcn/button";
import { Input } from "@ethui/ui/components/shadcn/input";
import { MoveRight, Plus, Trash2 } from "lucide-react";
import type { Address } from "viem";
import { AddressView } from "#/components/AddressView";
import { useContracts } from "#/store/useContracts";

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
          ({ address, name, chainId, proxyName }) => (
            <div
              key={address}
              className="flex flex-wrap hover:bg-accent xl:flex-nowrap"
            >
              <div className="grow pr-32">
                <Link
                  to="/home/contracts/$chainId/$address"
                  params={{ address: address, chainId: chainId }}
                  className="flex whitespace-nowrap p-4 align-baseline"
                >
                  <div className="flex w-full items-center gap-2">
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
              </div>
              {(!pendingDeleteContract ||
                pendingDeleteContract !== address) && (
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    className="h-full w-full"
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
                    className="flex h-full w-full text-sm hover:bg-transparent"
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

function AddressForm() {
  const [networks, currentNetwork] = useNetworks(
    useShallow((s) => [s.networks, s.current]),
  );
  const schema = z.object({
    dedupChainId: z.string(),
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid format"),
  });

  type Schema = z.infer<typeof schema>;

  const add = useContracts((s) => s.add);

  const form = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: {
      dedupChainId: JSON.stringify(currentNetwork?.dedup_chain_id),
    } as Schema,
  });

  const onSubmit = (data: FieldValues) => {
    const value = JSON.parse(data.dedupChainId);
    add(value.chain_id, value.dedup_id, data.address);
  };

  if (!currentNetwork) return null;

  return (
    <Form form={form} onSubmit={onSubmit}>
      <Form.Select
        label="Network"
        name="dedupChainId"
        defaultValue={currentNetwork.dedup_chain_id}
        items={networks}
        toValue={(n) => JSON.stringify(n.dedup_chain_id)}
        render={({ dedup_chain_id: { chain_id }, name }) => (
          <ChainView chainId={chain_id} name={name} />
        )}
      />

      <Form.Text label="Contract Address" name="address" />
      <Form.Submit label="Add" />
    </Form>
  );
}
