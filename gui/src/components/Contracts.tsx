import { zodResolver } from "@hookform/resolvers/zod";
import { ExpandMore } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
} from "@mui/material";
import { FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import { useInvoke } from "../hooks";
import { useContracts, useNetworks } from "../store";
import { ABIMatch, IContract } from "../types";
import { ABIForm, AddressView, Panel } from "./";

export function Contracts() {
  const chainId = useNetworks((s) => s.current?.chain_id);
  const contracts = useContracts((s) => s.contracts);

  return (
    <Panel>
      {chainId != 31337 && <AddressForm />}
      {Array.from(contracts || []).map((contract) => (
        <Contract key={contract.address} contract={contract} />
      ))}
    </Panel>
  );
}

function Contract({ contract }: { contract: IContract }) {
  const chainId = useNetworks((s) => s.current?.chain_id);

  // TODO: only do this if chainId == 31337
  const { data: foundryMatch } = useInvoke<ABIMatch>("foundry_get_abi", {
    address: contract.address,
    chainId,
  });

  const name = contract.name || foundryMatch?.name;
  const abi = contract.abi || foundryMatch?.abi;
  console.log(contract, chainId, foundryMatch);

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <AddressView address={contract.address} />
        <Chip sx={{ marginLeft: 2 }} label={name} />
      </AccordionSummary>
      {abi && (
        <AccordionDetails>
          <ABIForm address={contract.address} abi={abi} />
        </AccordionDetails>
      )}
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
