import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";
import { useShallow } from "zustand/shallow";

import { ChainView } from "@ethui/ui/components/chain-view";
import { Form } from "@ethui/ui/components/form";

import { useContracts } from "#/store/useContracts";
import { useNetworks } from "#/store/useNetworks";

export const Route = createFileRoute("/home/_l/contracts/_l/_l/add")({
  beforeLoad: () => ({ breadcrumb: "Add" }),
  component: RouteComponent,
});

function RouteComponent() {
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
    <Form form={form} onSubmit={onSubmit} className="p-2">
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

      <Form.Text label="Contract Address" name="address" className="w-full" />
      <Form.Submit label="Add" />
    </Form>
  );
}
