import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ethui/ui/components/shadcn/context-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/core";
import * as tauriClipboard from "@tauri-apps/plugin-clipboard-manager";
import { useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { type Address, getAddress } from "viem";
import { z } from "zod";

import { Form } from "@ethui/ui/components/form";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ethui/ui/components/shadcn/dialog";
import { Link } from "@tanstack/react-router";
import { useInvoke } from "#/hooks/useInvoke";
import { useNetworks } from "#/store/useNetworks";
import { truncateHex } from "#/utils";
import { IconAddress } from "./Icons/Address";
import { ClickToCopy } from "@ethui/ui/components/click-to-copy";

interface Props {
  address: Address;
  copyIcon?: boolean;
  contextMenu?: boolean;
  icon?: boolean;
}

export function AddressView({
  address: addr,
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
    <ClickToCopy text={address}>
      <div className="flex items-center gap-x-1 font-mono text-base">
        {icon && (
          <IconAddress
            chainId={network.chain_id}
            address={address}
            effigy
            className="h-4"
          />
        )}
        {text}
      </div>
    </ClickToCopy>
  );

  if (!contextMenu) return content;

  return (
    <ContextMenu>
      <ContextMenuTrigger className="cursor-pointer">
        {content}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => tauriClipboard.writeText(address)}>
          Copy to clipboard
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setAliasFormOpen(true)}>
          Set alias
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setAliasFormOpen(true)}>
          Clear alias
        </ContextMenuItem>
        <ContextMenuItem>
          <Link target="_blank" href={`${network.explorer_url}${address}`}>
            Open in explorer
          </Link>
        </ContextMenuItem>
      </ContextMenuContent>

      <Dialog open={aliasFormOpen} onOpenChange={setAliasFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set alias for {truncateHex(address)}</DialogTitle>
          </DialogHeader>
          <AliasForm
            {...{ address, alias, refetch }}
            onSubmit={() => setAliasFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </ContextMenu>
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
      <Form.Text label="Alias" name="alias" defaultValue={alias} />

      <Form.Submit label="Save" />
    </Form>
  );
}
