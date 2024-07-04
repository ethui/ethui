import { IconButton, Menu, MenuItem } from "@mui/material";
import { MoreVert as MoreVertIcon } from "@mui/icons-material";
import { Hash } from "viem";
import { useState } from "react";
import { Typography } from "@ethui/react/components";
import { useNetworks } from "@/store";
import { ContextMenuWithTauri } from "./ContextMenuWithTauri";
import { truncateHex } from "@/utils";


interface Props {
  hash: Hash;
}

export function HashView({ hash }: Props) {
  const [displayValue, setDisplayValue] = useState(hash.toString());
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const network = useNetworks((s) => s.current);
  if (!network) return null;

  const changeFormat = () => {
    const valueToString = displayValue.toString();

    const isHexadecimal = /^0x[0-9a-fA-F]+$/.test(valueToString);
    const isDecimal = /^([+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?)$/.test(
      valueToString
    );

    if (isHexadecimal) {
      const decimalValue = BigInt(valueToString);
      setDisplayValue(decimalValue.toString());
    } else if (isDecimal) {
      setDisplayValue(hash.toString());
    } else {
      setDisplayValue("Invalid");
    }
    setMenuAnchor(null);
  };

  const content = <Typography mono>{truncateHex(displayValue)}</Typography>;

  const onMenuOpen = (event: React.MouseEvent<HTMLElement>) =>
    setMenuAnchor(event.currentTarget);

  return (
    <>
      <ContextMenuWithTauri
        copy={displayValue}
        actions={[
          {
            label: "Open in explorer",
            href: `${network.explorer_url}${displayValue}`,
            disabled: !network.explorer_url,
          },
        ]}
      >
        {content}
        <IconButton aria-label="more" onClick={onMenuOpen}>
          <MoreVertIcon />
        </IconButton>
      </ContextMenuWithTauri>
      <Menu
        open={Boolean(menuAnchor)}
        anchorEl={menuAnchor}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={changeFormat}>Change Format</MenuItem>
      </Menu>
    </>
  );
}
