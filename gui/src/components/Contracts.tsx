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
import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import { useRefreshContracts } from "../hooks";
import { useContracts, useNetworks } from "../store";
import { IContract } from "../types";
import { ABIForm, AddressView, Panel } from "./";

export function Contracts() {
  const chainId = useNetworks((s) => s.current?.chain_id);

  if (!chainId) return null;

  const [contracts, setContracts] = useState<IContract[]>([]);

  const fetchContracts = async () => {
    invoke<IContract[]>("contracts_get_all", {
      chainId: chainId,
    }).then(setContracts);
  };

  useEffect(() => {
    fetchContracts();
  }, [chainId]);

  useRefreshContracts(fetchContracts);

  return (
    <Panel>
      <AddressInput chainId={chainId} />
      {Array.from(contracts || []).map((contract) => (
        <Contract key={contract.address} contract={contract} />
      ))}
    </Panel>
  );
}

function Contract({ contract }: { contract: IContract }) {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <AddressView address={contract.address} />
        <Chip sx={{ marginLeft: 2 }} label={contract.name} />
      </AccordionSummary>
      {contract.abi && (
        <AccordionDetails>
          <ABIForm address={contract.address} abi={contract.abi} />
        </AccordionDetails>
      )}
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

  const onSubmit = (data: FieldValues) => {
    addAddress(chainId, data.address);

    const contract_address = data.address;
    invoke("db_insert_contract", { chainId, address: contract_address });
  };

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
