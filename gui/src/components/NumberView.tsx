import { Grid, IconButton, Stack } from "@mui/material";
import { MoreVert as MoreVertIcon } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { formatEther, formatGwei, parseEther, parseGwei } from "viem";

import { ContextMenuWithTauri } from "./ContextMenuWithTauri";
import { Modal } from "./Modal";
import { Datapoint } from "./Datapoint";

interface Props {
  value: bigint | string;
  unit?: string;
}

export function NumberView({ value, unit }: Props) {
  const [unitValues, setUnitValues] = useState({
    wei: "",
    gwei: "",
    eth: "",
    decimal: "",
    hex: "",
  });

  const [unitValuesOpen, setUnitValuesOpen] = useState(false);

  useEffect(() => {
    convertUnit(value, unit || "decimal");
  }, [value, unit]);

  const convertUnit = (value: string | bigint, unit: string) => {
    const bigIntValue = BigInt(value);
    const weiValue =
      unit === "wei"
        ? bigIntValue
        : unit === "gwei"
          ? parseGwei(bigIntValue.toString(), "wei")
          : unit === "eth"
            ? parseEther(bigIntValue.toString(), "wei")
            : bigIntValue;

    const gweiValue = formatGwei(weiValue);
    const ethValue = formatEther(weiValue);
    const decimalValue = weiValue.toString(10);
    const hexValue = "0x" + weiValue.toString(16);

    setUnitValues({
      wei: weiValue.toString(),
      gwei: gweiValue,
      eth: ethValue,
      decimal: decimalValue,
      hex: hexValue,
    });
  };

  const content = (
    <Grid container rowSpacing={1} columns={1}>
      <Datapoint
        label="Ether"
        value={
          <ContextMenuWithTauri copy={unitValues.eth}>
            {unitValues.eth}
          </ContextMenuWithTauri>
        }
        size="small"
      />
      <Datapoint
        label="Wei"
        value={
          <ContextMenuWithTauri copy={unitValues.wei}>
            {unitValues.wei}
          </ContextMenuWithTauri>
        }
        size="small"
      />
      <Datapoint
        label="Gwei"
        value={
          <ContextMenuWithTauri copy={unitValues.gwei}>
            {unitValues.gwei}
          </ContextMenuWithTauri>
        }
        size="small"
      />
      <Datapoint
        label="Hexadecimal"
        value={
          <ContextMenuWithTauri copy={unitValues.hex}>
            {unitValues.hex}
          </ContextMenuWithTauri>
        }
        size="small"
      />
      <Datapoint
        label="Decimal"
        value={
          <ContextMenuWithTauri copy={unitValues.decimal}>
            {unitValues.decimal}
          </ContextMenuWithTauri>
        }
        size="small"
      />
    </Grid>
  );

  return (
    <Stack direction="row">
      <div style={{ display: "flex", alignItems: "center" }}>
        <ContextMenuWithTauri copy={value}>
          {value.toString()}
        </ContextMenuWithTauri>
        <IconButton
          aria-label="transfer"
          onClick={() => setUnitValuesOpen(true)}
        >
          <MoreVertIcon />
        </IconButton>
        <Modal open={unitValuesOpen} onClose={() => setUnitValuesOpen(false)}>
          {content}
        </Modal>
      </div>
    </Stack>
  );
}