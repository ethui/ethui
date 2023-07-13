import { zodResolver } from "@hookform/resolvers/zod";
import { ExpandMore } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Chip,
  Stack,
  TextField,
} from "@mui/material";
import { FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import ABIdata from "../erc20.json";
import { useNetworks } from "../store";
import { useContracts } from "../store/contracts";
import { Address } from "../types";
import { ABIForm, AddressView, Panel } from "./";

export function Contracts() {
  const chainId = useNetworks((s) => s.current?.chain_id);
  const contracts = useContracts((s) => s.data);

  // TODO
  useContracts();

  if (!chainId || !contracts) return null;

  return (
    <Panel>
      <AddressInput chainId={chainId} />
      {Array.from(contracts[chainId] || []).map((contract) => (
        <Contract key={contract} address={contract} />
      ))}
    </Panel>
  );
}

function Contract({ address }: { address: Address }) {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <AddressView address={address} />
        <Chip sx={{ marginLeft: 2 }} label="ERC20" />
      </AccordionSummary>
      <AccordionDetails>
        <ABIForm address={address} abi={ABIdata} />
      </AccordionDetails>
    </Accordion>
  );
}

function AddressInput({ chainId }: { chainId: number }) {
  const schema = z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid format"),
  });

  const addAddress = useContracts((s) => s.addAddress);

  const {
    handleSubmit,
    formState: { isValid, errors },
    register,
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FieldValues) => addAddress(chainId, data.address);

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
        <Button variant="contained" type="submit" disabled={!isValid}>
          Add
        </Button>
      </Stack>
    </form>
  );
}
