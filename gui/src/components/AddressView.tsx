import { zodResolver } from "@hookform/resolvers/zod";
import { ContentCopySharp } from "@mui/icons-material";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api";
import { useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import truncateEthAddress from "truncate-eth-address";
import { Address, getAddress } from "viem";
import { z } from "zod";

import { useInvoke } from "@/hooks";

import { ContextMenu, Modal, MonoText } from "./";

interface Props {
  address: Address;
  contextMenu?: boolean;
  copyIcon?: boolean;
  mono?: boolean;
}

export function AddressView({
  contextMenu,
  address: addr,
  copyIcon,
  mono = false,
}: Props) {
  const address = getAddress(addr);
  const { data: alias, mutate } = useInvoke<string>("settings_get_alias", {
    address,
  });
  const [aliasFormOpen, setAliasFormOpen] = useState(false);

  const contextActions = [
    { label: "Set alias", action: () => setAliasFormOpen(true) },
    {
      label: "Clear alias",
      action: () => {
        invoke("settings_set_alias", { address, alias: null });
        mutate();
      },
      disabled: !alias,
    },
  ];

  const text = alias ? alias : truncateEthAddress(`${address}`);
  const content = (
    <>
      {mono && <MonoText>{text}</MonoText>}
      {!mono && <Typography>{text}</Typography>}
      {copyIcon && <ContentCopySharp fontSize="small" sx={{ ml: 1 }} />}
    </>
  );

  return (
    <>
      {!contextMenu && (
        <Box fontSize="inherit" title={address}>
          {content}
        </Box>
      )}

      {contextMenu && (
        <>
          <ContextMenu
            copy={address}
            explorer={address}
            actions={contextActions}
            sx={{ textTransform: "none" }}
          >
            {content}
          </ContextMenu>

          <Modal open={aliasFormOpen} onClose={() => setAliasFormOpen(false)}>
            <AliasForm
              {...{ address, alias, mutate }}
              onSubmit={() => setAliasFormOpen(false)}
            />
          </Modal>
        </>
      )}
    </>
  );
}

AddressView.defaultProps = {
  contextMenu: true,
  copyIcon: false,
};

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
