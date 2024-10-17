import { zodResolver } from "@hookform/resolvers/zod";
import {
  Chip,
  CircularProgress,
  SpeedDial,
  SpeedDialIcon,
  TextField,
} from "@mui/material";
import { createLazyFileRoute } from "@tanstack/react-router";
import debounce from "lodash-es/debounce";
import { useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import { ChainView } from "@ethui/react/components/ChainView";
import { Form } from "@ethui/react/components/Form";
import type { Contract } from "@ethui/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ethui/ui/components/ui/accordion";
import { ABIForm } from "#/components/ABIForm";
import { AddressView } from "#/components/AddressView";
import { Navbar } from "#/components/Home/Navbar";
import { Modal } from "#/components/Modal";
import { useContracts } from "#/store/useContracts";
import { useNetworks } from "#/store/useNetworks";

export const Route = createLazyFileRoute("/_home/home/contracts")({
  component: Contracts,
});

export function Contracts() {
  const [filter, setFilter] = useState("");
  const contracts = useContracts((s) => s.filteredContracts(filter));
  const [addContractOpen, setAddContractOpen] = useState(false);

  return (
    <>
      <Navbar>Contracts</Navbar>

      <Filter onChange={(f) => setFilter(f)} />

      <Accordion type="single" collapsible className="w-full">
        {Array.from(contracts || []).map((contract) => (
          <ContractView key={contract.address} contract={contract} />
        ))}
      </Accordion>

      <SpeedDial
        ariaLabel="Add contract"
        sx={{ position: "absolute", bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
        onClick={() => setAddContractOpen(true)}
      />

      <Modal open={addContractOpen} onClose={() => setAddContractOpen(false)}>
        <AddressForm />
      </Modal>
    </>
  );
}

function Filter({ onChange }: { onChange: (f: string) => void }) {
  return (
    <form>
      <div className="m-1 items-stretch">
        <TextField
          onChange={debounce((e) => onChange(e.target.value), 100)}
          fullWidth
          placeholder="Filter..."
        />
      </div>
    </form>
  );
}

function ContractView({
  contract: { address, name, chainId },
}: {
  contract: Contract;
}) {
  return (
    <AccordionItem value={address}>
      <AccordionTrigger>
        <AddressView address={address} />
        {name && (
          <Chip
            sx={{ marginLeft: 2 }}
            label={name}
            color="primary"
            variant="outlined"
          />
        )}
      </AccordionTrigger>
      <AccordionContent>
        <ABIForm address={address} chainId={chainId} />
      </AccordionContent>
    </AccordionItem>
  );
}

function AddressForm() {
  const [networks, currentNetwork] = useNetworks((s) => [
    s.networks,
    s.current,
  ]);
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
      <div className="m-1 items-start">
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

        <Form.Text
          label="Contract Address"
          name="address"
          size="small"
          fullWidth
        />

        <Form.Submit
          label={form.formState.isSubmitting ? <CircularProgress /> : "Add"}
        />
      </div>
    </Form>
  );
}
