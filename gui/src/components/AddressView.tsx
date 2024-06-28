import { zodResolver } from "@hookform/resolvers/zod";
import { Stack } from "@mui/material";
import { invoke } from "@tauri-apps/api";
import { useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { type Address, getAddress } from "viem";
import { z } from "zod";

import { Form, Typography } from "@ethui/react/components";
import { useInvoke } from "@/hooks";
import { ContextMenuWithTauri, Modal } from "./";
import { useNetworks } from "@/store";
import { IconAddress } from "./Icons";
import { truncateHex } from "@/utils";

interface Props {
  address: Address;
  copyIcon?: boolean;
  mono?: boolean;
  contextMenu?: boolean;
  variant?: "h6";
  icon?: boolean;
}

export function AddressView({
  address: addr,
  mono = false,
  contextMenu = true,
  variant,
  icon = false,
}: Props) {
  const network = useNetworks((s) => s.current);
  const address = getAddress(addr);
  const { data: alias, refetch } = useInvoke<string>("settings_get_alias", {
    address,
  });
  const [aliasFormOpen, setAliasFormOpen] = useState(false);

  if (!network) return;

  const text = alias ? alias : truncateHex(address);
  const content = (
    <Stack direction="row" alignItems="center" spacing={1}>
      {icon && (
        <IconAddress
          chainId={network.chain_id}
          address={address}
          size="small"
          effigy
        />
      )}
      <Typography mono={mono} variant={variant}>
        {text}
      </Typography>
    </Stack>
  );

  if (!contextMenu) return content;

  return (
    <ContextMenuWithTauri
      copy={address}
      actions={[
        {
          label: "Open in explorer",
          href: `${network.explorer_url}${address}`,
          disabled: !network.explorer_url,
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
          {...{ address, alias, refetch }}
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
  refetch: () => void;
  onSubmit: () => void;
}

function AliasForm({ address, alias, refetch, onSubmit }: AliasFormProps) {
  const form = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
  });

  const submit = (data: FieldValues) => {
    invoke("settings_set_alias", { address, alias: data.alias });
    refetch();
    onSubmit();
  };

  return (
    <Form form={form} onSubmit={submit}>
      <Stack alignItems="flex-start" spacing={2}>
        <Typography>Set alias for {truncateHex(address)}</Typography>
        <Form.Text label="Alias" name="alias" defaultValue={alias} />

        <Form.Submit label="Save" />
      </Stack>
    </Form>
  );
}
