import { ClickToCopy } from "@ethui/ui/components/click-to-copy";
import { Form } from "@ethui/ui/components/form";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ethui/ui/components/shadcn/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ethui/ui/components/shadcn/dialog";
import { cn } from "@ethui/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import * as tauriClipboard from "@tauri-apps/plugin-clipboard-manager";
import { FileCode2, Wallet } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { type Address, getAddress } from "viem";
import { z } from "zod";
import { useInvoke } from "#/hooks/useInvoke";
import { useIsContract } from "#/hooks/useIsContract";
import { useNetworks } from "#/store/useNetworks";
import { truncateHex } from "#/utils";
import { IconAddress } from "./Icons/Address";
import { PropagationStopper } from "./PropagationStopper";

interface Props {
  address: Address;
  copyIcon?: boolean;
  contextMenu?: boolean;
  icon?: boolean;
  noTextStyle?: boolean;
  clickToCopy?: boolean;
  className?: string;
  showAlias?: boolean;
  showLinkExplorer?: boolean;
  showTypeIcon?: boolean;
}

export function AddressView({
  address: addr,
  contextMenu = true,
  icon = false,
  noTextStyle = false,
  clickToCopy = true,
  showAlias = true,
  showLinkExplorer = true,
  showTypeIcon = false,
  className,
}: Props) {
  const network = useNetworks((s) => s.current);
  const address = getAddress(addr);
  const { data: alias, refetch } = useInvoke<string>("settings_get_alias", {
    address,
  });
  const { isContract } = useIsContract(
    address,
    network?.dedup_chain_id.chain_id || 1,
  );
  const [aliasFormOpen, setAliasFormOpen] = useState(false);

  if (!network) return;

  const text = showAlias ? alias || truncateHex(address) : truncateHex(address);

  const addressContent = (
    <div
      className={cn(
        "flex items-center gap-x-2 font-mono",
        noTextStyle ? "" : "text-base",
        showLinkExplorer && "text-solidity-value hover:text-sky-700",
        className,
      )}
    >
      {showTypeIcon && isContract && (
        <FileCode2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      )}
      {icon && (
        <IconAddress
          chainId={network.dedup_chain_id.chain_id}
          address={address}
          effigy
          className="h-5 w-5"
        />
      )}
      {text}
    </div>
  );

  const content = showLinkExplorer ? (
    <ClickToCopy text={address}>
      <Link params={{ address }} to="/home/explorer/addresses/$address">
        {addressContent}
      </Link>
    </ClickToCopy>
  ) : clickToCopy ? (
    <ClickToCopy text={address}>{addressContent}</ClickToCopy>
  ) : (
    addressContent
  );

  if (!contextMenu) return content;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{content}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            tauriClipboard.writeText(address);
          }}
        >
          Copy to clipboard
        </ContextMenuItem>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setAliasFormOpen(true);
          }}
        >
          Set alias
        </ContextMenuItem>
        {alias && (
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              invoke("settings_set_alias", { address, alias: null });
              refetch();
            }}
          >
            Clear alias
          </ContextMenuItem>
        )}
        <ContextMenuItem>
          <PropagationStopper>
            <Link target="_blank" to={`${network.explorer_url}${address}`}>
              Open in explorer
            </Link>
          </PropagationStopper>
        </ContextMenuItem>
      </ContextMenuContent>

      <Dialog open={aliasFormOpen} onOpenChange={setAliasFormOpen} modal={true}>
        <PropagationStopper>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set alias for {truncateHex(address)}</DialogTitle>
            </DialogHeader>
            <AliasForm
              {...{ address, alias, refetch }}
              onSubmit={() => setAliasFormOpen(false)}
            />
          </DialogContent>
        </PropagationStopper>
      </Dialog>
    </ContextMenu>
  );
}

const schema = z.object({
  alias: z.string().optional(),
});

type AliasFormData = z.infer<typeof schema>;

interface AliasFormProps {
  address: string;
  alias?: string;
  refetch: () => void;
  onSubmit: () => void;
}

function AliasForm({ address, alias, refetch, onSubmit }: AliasFormProps) {
  const form = useForm<AliasFormData>({
    mode: "onChange",
    resolver: zodResolver(schema),
  });

  const submit = (data: AliasFormData) => {
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
