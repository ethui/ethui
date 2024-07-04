import { IconButton, Menu, MenuItem } from "@mui/material";
import { MoreVert as MoreVertIcon } from "@mui/icons-material";
import { useState } from "react";
import { formatEther, formatGwei, parseEther } from "viem";

import { Typography } from "@ethui/react/components";
import { ContextMenuWithTauri } from "./ContextMenuWithTauri";
import { useNetworks } from "@/store";



interface Props {
  value: number;
}

export function NumberView({ value}: Props) {
  const [displayValue, setDisplayValue] = useState(value.toString());
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [formatValue, setFormatValue] = useState('Hexadecimal');

  const network = useNetworks((s) => s.current);
  if (!network) return null;

  const formatGweiValue = () => {
    setDisplayValue(formatGwei(BigInt(value)) + " gwei");
    setMenuAnchor(null);
  };

  const formatWeiValue = () => {
    const weiValue = parseEther(formatEther(BigInt(value)).toString());
    setDisplayValue(weiValue.toString() + " wei");
    setMenuAnchor(null);
  };

  const formatEtherValue = () => {
    setDisplayValue(formatEther(BigInt(value)) + " eth");
    setMenuAnchor(null);
  };



const changeFormat = () => {
  if (formatValue == 'Decimal') {
    setFormatValue('Hexadecimal');
    setDisplayValue(value.toString());

  } else if (formatValue == 'Hexadecimal') {
    setFormatValue('Decimal');
    const numberValue = Number(value);
    const hexadecimalValue = numberValue.toString(16).toUpperCase();
    setDisplayValue('0x' + hexadecimalValue);

  } else {
    setDisplayValue(value.toString());
  }
  setMenuAnchor(null);
};


  const content = <Typography mono>{displayValue}</Typography>;

  const onMenuOpen = (event: React.MouseEvent<HTMLElement>) =>
    setMenuAnchor(event.currentTarget);

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
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
      </ContextMenuWithTauri>

      <IconButton aria-label="more" onClick={onMenuOpen}>
        <MoreVertIcon />
      </IconButton>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)}>
        <MenuItem onClick={formatWeiValue}>Wei</MenuItem>
        <MenuItem onClick={formatGweiValue}>Gwei</MenuItem>
        <MenuItem onClick={formatEtherValue}>Ether</MenuItem>
        <MenuItem onClick={changeFormat}>Change to {formatValue}</MenuItem>
      </Menu>
    </div>
  );
}
