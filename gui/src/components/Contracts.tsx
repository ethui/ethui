import {zodResolver} from "@hookform/resolvers/zod";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
} from "@mui/material";
import {FieldValues, useForm} from "react-hook-form";
import {Address} from "viem";
import {z} from "zod";
import {useState} from "react";

import {useApi} from "@/hooks";
import {useContracts, useNetworks} from "@/store";
import {
  ABIForm,
  AddressView,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from "./";
import {Navbar} from "./Home/Navbar";
import SearchBar from "./SearchBar";

export function Contracts() {
  const chainId = useNetworks((s) => s.current?.chain_id);
  const addresses = useContracts((s) => s.addresses);

  const [searchTerm, setSearchTerm] = useState<string>("");

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  return (
    <>
      <Navbar>Contracts</Navbar>
      <Box sx={{p: 2}}>
        <SearchBar onSearch={handleSearch} />
      </Box>
      {chainId != 31337 && <AddressForm />}
      {Array.from(addresses || []).map((address) => (
        <Contract key={address} address={address} />
      ))}
    </>
  );
}

function Contract({address}: {address: Address}) {
  const chainId = useNetworks((s) => s.current?.chain_id);
  const {data: name} = useApi<string>("/contracts/name", {
    address,
    chainId,
  });

  if (!chainId) return null;

  return (
    <Accordion>
      <AccordionSummary>
        <AddressView address={address} />
        <Chip sx={{marginLeft: 2}} label={name} />
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
    formState: {isValid, errors, isSubmitting},
    register,
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FieldValues) => add(data.address);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack direction='row' spacing={2}>
        <TextField
          label='Contract Address'
          error={!!errors.address}
          helperText={errors.address?.message?.toString() || ""}
          fullWidth
          {...register("address")}
        />
        <Button
          variant='contained'
          type='submit'
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? <CircularProgress /> : "Add"}
        </Button>
      </Stack>
    </form>
  );
}
