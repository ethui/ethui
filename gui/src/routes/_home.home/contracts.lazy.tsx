import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { createLazyFileRoute } from "@tanstack/react-router";
import debounce from "lodash-es/debounce";
import { useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";
import { useShallow } from "zustand/shallow";

import type { Contract } from "@ethui/types";
import { ChainView } from "@ethui/ui/components/chain-view";
import { Form } from "@ethui/ui/components/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ethui/ui/components/shadcn/accordion";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@ethui/ui/components/shadcn/dialog";
import { Input } from "@ethui/ui/components/shadcn/input";
import { Plus } from "lucide-react";
import { ABIForm } from "#/components/ABIForm";
import { AddressView } from "#/components/AddressView";
import { AppNavbar } from "#/components/AppNavbar";
import { useContracts } from "#/store/useContracts";
import { useNetworks } from "#/store/useNetworks";
import { Badge } from "@ethui/ui/components/shadcn/badge";
import { Button } from "@ethui/ui/components/shadcn/button";

export const Route = createLazyFileRoute("/_home/home/contracts")({
  component: Contracts,
});

export function Contracts() {
  const [filter, setFilter] = useState("");
  const contracts = useContracts(
    useShallow((s) => s.filteredContracts(filter)),
  );

  return (
    <>
      <AppNavbar title="Contracts" />
      <Filter onChange={(f) => setFilter(f)} />

      <Accordion type="multiple" className="w-full">
        {Array.from(contracts || []).map((contract) => (
          <ContractView key={contract.address} contract={contract} />
        ))}
      </Accordion>

      <Dialog>
        <DialogTrigger>
          <Button size="icon" className="fixed bottom-6 right-6">
            <Plus />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <AddressForm />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Filter({ onChange }: { onChange: (f: string) => void }) {
  return (
    <form className="flex items-stretch">
      <Input
        onChange={debounce((e) => onChange(e.target.value), 100)}
        placeholder="Filter..."
        className="h-10"
      />
    </form>
  );
}

interface ContractViewProps {
  contract: Contract;
}

function ContractView({
  contract: { address, name, chainId },
}: ContractViewProps) {
  return (
    <AccordionItem value={address}>
      <AccordionTrigger>
        <div className="flex items-baseline justify-start">
          <AddressView address={address} />
          {name && (
            <Badge variant="secondary" className="ml-2">
              {name}
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <ABIForm address={address} chainId={chainId} />
      </AccordionContent>
    </AccordionItem>
  );
}

function AddressForm() {
  const [networks, currentNetwork] = useNetworks(
    useShallow((s) => [s.networks, s.current]),
  );
  const schema = z.object({
    chainId: z.number(),
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid format"),
  });

  type Schema = z.infer<typeof schema>;

  const add = useContracts((s) => s.add);

  const form = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: { chainId: currentNetwork?.chain_id } as Schema,
  });

  const onSubmit = (data: FieldValues) => add(data.chainId, data.address);

  if (!currentNetwork) return null;

  return (
    <Form form={form} onSubmit={onSubmit}>
      <Form.Select
        label="Network"
        name="chainId"
        defaultValue={currentNetwork.chain_id}
        items={networks}
        toValue={(n) => n.chain_id.toString()}
        render={({ chain_id, name }) => (
          <ChainView chainId={chain_id} name={name} />
        )}
      />

      <Form.Text label="Contract Address" name="address" />

      <Form.Submit
        label={
          form.formState.isSubmitting ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            "Add"
          )
        }
      />
    </Form>
  );
}
