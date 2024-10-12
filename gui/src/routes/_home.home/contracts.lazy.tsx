import { zodResolver } from "@hookform/resolvers/zod";
import {
  Chip,
  CircularProgress,
  Stack,
  TextField,
  SpeedDial,
  SpeedDialIcon,
} from "@mui/material";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";
import { createLazyFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import debounce from "lodash-es/debounce";

import type { Contract } from "@ethui/types";
import { ChainView, Form } from "@ethui/react/components";
import {
  Modal,
  AddressView,
  ABIForm,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from "@/components/";
import { useContracts, useNetworks } from "@/store";
import { Navbar } from "@/components/Home/Navbar";

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

      {Array.from(contracts || []).map((contract) => (
        <ContractView key={contract.address} contract={contract} />
      ))}

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
      <Stack direction="row" alignItems="stretch" spacing={2}>
        <TextField
          onChange={debounce((e) => onChange(e.target.value), 100)}
          fullWidth
          placeholder="Filter..."
        />
      </Stack>
    </form>
  );
}

function ContractView({
  contract: { address, name, chainId },
}: {
  contract: Contract;
}) {
  return (
    <Accordion>
      <AccordionSummary>
        <AddressView address={address} />
        {name && (
          <Chip
            sx={{ marginLeft: 2 }}
            label={name}
            color="primary"
            variant="outlined"
          />
        )}
      </AccordionSummary>
      <AccordionDetails>
        <ABIForm address={address} chainId={chainId} />
      </AccordionDetails>
    </Accordion>
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
      <Stack alignItems="flex-start" spacing={2}>
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
      </Stack>
    </Form>
  );
}
