import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { type Address, getAddress } from "viem";
import { z } from "zod";

import { Form } from "@ethui/react/components/Form";

import clsx from "clsx";
import { useInvoke } from "#/hooks/useInvoke";
import { useNetworks } from "#/store/useNetworks";
import { truncateHex } from "#/utils";
import { ContextMenuWithTauri } from "./ContextMenuWithTauri";
import { IconAddress } from "./Icons/Address";
import { Modal } from "./Modal";

interface Props {
  address: Address;
  copyIcon?: boolean;
  mono?: boolean;
  contextMenu?: boolean;
  icon?: boolean;
}

export function AddressView({
  address: addr,
  mono = false,
  contextMenu = true,
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
    <div className=" m-1 flex items-center">
      {icon && (
        <IconAddress
          chainId={network.chain_id}
          address={address}
          size="small"
          effigy
        />
      )}
      <span className={clsx({ "font-mono": mono })}>{text}</span>
    </div>
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
      <div className="m-2 flex flex-col items-start">
        <span>Set alias for {truncateHex(address)}</span>
        <Form.Text label="Alias" name="alias" defaultValue={alias} />

        <Form.Submit label="Save" />
      </div>
    </Form>
  );
}
