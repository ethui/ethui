import { useState } from "react";
import { useNetworks } from "@/store";
import { ContextMenuWithTauri } from "./ContextMenuWithTauri";
import { Typography } from "@ethui/react/components";
import { IconButton, Menu, MenuItem } from "@mui/material";
import { MoreVert as MoreVertIcon } from "@mui/icons-material";
import { formatEther, formatGwei, parseEther } from "viem";

interface Props {
  value: number;
}

export function NumberView({ value}: Props) {
  const [displayValue, setDisplayValue] = useState(formatEther(BigInt(value)) + ' eth');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

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
    const newValue = displayValue.split(' ')[0];
    const isHexadecimal = /^(.*[A-Za-z])[0-9A-Za-z]*$/.test(newValue);
    const isDecimal = /^([+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?)$/.test(newValue);

    if (isHexadecimal) {
      setDisplayValue(formatEther(BigInt(value)) + ' eth');
  
    } else if (isDecimal) {
      const numberValue = Number(newValue);
      const hexadecimalValue = numberValue.toString(16).toUpperCase();
      setDisplayValue('0x' + hexadecimalValue + " " + displayValue.split(' ')[1]);
  
    } else {
      setDisplayValue(newValue);
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
        <MenuItem onClick={changeFormat}>Change Format</MenuItem>
      </Menu>
    </div>
  );
}
