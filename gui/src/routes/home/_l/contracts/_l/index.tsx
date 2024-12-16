import { zodResolver } from "@hookform/resolvers/zod";
import { Link, createFileRoute } from "@tanstack/react-router";
import debounce from "lodash-es/debounce";
import { useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";
import { useShallow } from "zustand/shallow";

import { ChainView } from "@ethui/ui/components/chain-view";
import { Form } from "@ethui/ui/components/form";
import { Badge } from "@ethui/ui/components/shadcn/badge";
import { Button } from "@ethui/ui/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ethui/ui/components/shadcn/dialog";
import { Input } from "@ethui/ui/components/shadcn/input";
import { Plus } from "lucide-react";
import { AddressView } from "#/components/AddressView";
import { useContracts } from "#/store/useContracts";
import { useNetworks } from "#/store/useNetworks";

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
        {Array.from(contracts || []).map(({ address, name, chainId }) => (
          <Link
            key={address}
            to="/home/contracts/$chainId/$address"
            params={{ address: address, chainId: chainId }}
            className="flex p-4 align-baseline hover:bg-accent"
          >
            <AddressView address={address} />
            {name && (
              <Badge variant="secondary" className="ml-2">
                {name}
              </Badge>
            )}
          </Link>
        ))}
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button size="icon" className="fixed right-6 bottom-6">
            <Plus />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contract</DialogTitle>
            <DialogDescription>
              Manually add a contract to the list of known contracts.
            </DialogDescription>
          </DialogHeader>
          <AddressForm />
        </DialogContent>
      </Dialog>
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
    chainId: z.string(),
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid format"),
  });

  type Schema = z.infer<typeof schema>;

  const add = useContracts((s) => s.add);

  const form = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: { chainId: currentNetwork?.chain_id?.toString() } as Schema,
  });

  const onSubmit = (data: FieldValues) => add(data.chainId, data.address);

  if (!currentNetwork) return null;

  return (
    <Form form={form} onSubmit={onSubmit}>
      <Form.Select
        label="Network"
        name="chainId"
        defaultValue={currentNetwork.chain_id.toString()}
        items={networks}
        toValue={(n) => n.chain_id.toString()}
        render={({ chain_id, name }) => (
          <ChainView chainId={chain_id} name={name} />
        )}
      />

      <Form.Text label="Contract Address" name="address" />
      <Form.Submit label="Add" />
    </Form>
  );
}
