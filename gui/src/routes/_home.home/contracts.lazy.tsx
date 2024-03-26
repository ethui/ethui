import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
} from "@mui/material";
import { FieldValues, useForm } from "react-hook-form";
import { z } from "zod";
import { createLazyFileRoute } from "@tanstack/react-router";

import { Contract } from "@ethui/types";
import { useContracts, useNetworks } from "@/store";
import {
  ABIForm,
  AddressView,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from "@/components";
import { Navbar } from "@/components/Home/Navbar";

export const Route = createLazyFileRoute("/_home/home/contracts")({
  component: Contracts,
});

export function Contracts() {
  const chainId = useNetworks((s) => s.current?.chain_id);
  const contracts = useContracts((s) => s.contracts);

  return (
    <>
      <Navbar>Contracts</Navbar>
      {chainId != 31337 && <AddressForm />}
      {Array.from(contracts || []).map((contract) => (
        <ContractView key={contract.address} contract={contract} />
      ))}
    </>
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
        <Chip sx={{ marginLeft: 2 }} label={name} />
      </AccordionSummary>
      <AccordionDetails>
        <ABIForm address={address} chainId={chainId} />
      </AccordionDetails>
    </Accordion>
  );
}

function AddressForm() {
  const schema = z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid format"),
  });

  const add = useContracts((s) => s.add);

  const {
    handleSubmit,
    formState: { isValid, errors, isSubmitting },
    register,
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FieldValues) => add(data.address);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack direction="row" spacing={2}>
        <TextField
          label="Contract Address"
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
