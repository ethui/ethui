import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api";
import { useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import truncateEthAddress from "truncate-eth-address";
import { getAddress } from "viem";
import { z } from "zod";

import { useInvoke } from "@/hooks";
import { ContextMenuWithTauri, Modal } from "./";
import { useNetworks } from "@/store";

interface Props {
  address: string;
}

export function AddressView({ address: addr }: Props) {
  const network = useNetworks((s) => s.current);
  const address = getAddress(addr);
  const { data: alias, mutate } = useInvoke<string>("settings_get_alias", {
    address,
  });
  const [aliasFormOpen, setAliasFormOpen] = useState(false);

  if (!network) return;

  const content = <>{alias ? alias : truncateEthAddress(`${address}`)}</>;

  return (
    <ContextMenuWithTauri
      copy={address}
      actions={[
        {
          label: "Open in explorer",
          href: `${network.explorer_url}${address}`,
        },
        { label: "Set alias", action: () => setAliasFormOpen(true) },
        {
          label: "Clear alias",
          action: () => setAliasFormOpen(true),
          disabled: !alias,
        },
      ]}
      sx={{ textTransform: "none" }}
    >
      {content}

      <Modal open={aliasFormOpen} onClose={() => setAliasFormOpen(false)}>
        <AliasForm
          {...{ address, alias, mutate }}
          onSubmit={() => setAliasFormOpen(false)}
        />
      </Modal>
    </ContextMenuWithTauri>
  );
}

const schema = z.object({
  alias: z.string().optional(),
});

interface AliasFormProps {
  address: string;
  alias?: string;
  mutate: () => void;
  onSubmit: () => void;
}

function AliasForm({ address, alias, mutate, onSubmit }: AliasFormProps) {
  const {
    handleSubmit,
    register,
    formState: { isDirty, isValid, errors },
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
  });

  const submit = (data: FieldValues) => {
    invoke("settings_set_alias", { address, alias: data.alias });
    mutate();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit(submit)}>
      <Stack alignItems="flex-start" spacing={2}>
        <Typography>Set alias for {truncateEthAddress(address)}</Typography>
        <TextField
          label="Alias"
          defaultValue={alias}
          error={!!errors.alias}
          helperText={errors.alias?.message?.toString() || ""}
          fullWidth
          {...register("alias")}
        />

        <Button
          variant="contained"
          type="submit"
          disabled={!isDirty || !isValid}
        >
          Save
        </Button>
      </Stack>
    </form>
  );
}
