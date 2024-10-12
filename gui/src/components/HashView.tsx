import type { Hash } from "viem";

import { Typography } from "@ethui/react/components";
import { useNetworks } from "#/store";
import { truncateHex } from "#/utils";
import { ContextMenuWithTauri } from "./ContextMenuWithTauri";

interface Props {
  hash: Hash;
}

export function HashView({ hash }: Props) {
  const network = useNetworks((s) => s.current);

  if (!network) return null;

  const content = <Typography mono>{truncateHex(hash)}</Typography>;

  return (
    <ContextMenuWithTauri
      copy={hash}
      actions={[
        {
          label: "Open in explorer",
          href: `${network.explorer_url}${hash}`,
          disabled: !network.explorer_url,
        },
      ]}
    >
      {content}
    </ContextMenuWithTauri>
  );
}
