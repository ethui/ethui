import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  SpeedDial,
  SpeedDialIcon,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { Controller, FieldValues, useForm } from "react-hook-form";
import { z } from "zod";
import { createLazyFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import debounce from "lodash-es/debounce";

import { Contract } from "@ethui/types";
import { ChainView } from "@ethui/react/components";
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
      ></SpeedDial>

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
        {name && <Chip sx={{ marginLeft: 2 }} label={name} />}
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

  const {
    handleSubmit,
    formState: { isValid, errors, isSubmitting },
    control,
    register,
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: { chainId: currentNetwork?.chain_id } as Schema,
  });

  const onSubmit = (data: FieldValues) => add(data.chainId, data.address);

  if (!currentNetwork) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack alignItems="flex-start" spacing={2}>
        <FormControl>
          <Controller
            name="chainId"
            defaultValue={currentNetwork.chain_id}
            control={control}
            render={({ field }) => (
              <Select
                label="Network"
                size="small"
                error={!!errors.chainId}
                {...field}
              >
                {networks.map(({ chain_id, name }) => (
                  <MenuItem key={chain_id} value={chain_id}>
                    <ChainView chainId={chain_id} name={name} />
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </FormControl>

        <TextField
          label="Contract Address"
          size="small"
          error={!!errors.address}
          helperText={errors.address?.message?.toString() || ""}
          fullWidth
          {...register("address")}
        />

        <Button
          variant="contained"
          type="submit"
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? <CircularProgress /> : "Add"}
        </Button>
      </Stack>
    </form>
  );
}
