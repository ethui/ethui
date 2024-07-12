import { Grid, IconButton, Popover, Stack } from "@mui/material";
import { MoreVert as MoreVertIcon } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { formatUnits, parseUnits } from "viem";

import { ContextMenuWithTauri } from "./ContextMenuWithTauri";
import { Modal } from "./Modal";
import { Datapoint } from ".";

interface Props {
  value: bigint | string;
  unit: string;
}

export function NumberView({ value, unit }: Props) {
  const [anchorEl, setAnchorEl] = useState<{
    [key: string]: HTMLElement | null;
  }>({});
  const [unitValuesOpen, setUnitValuesOpen] = useState(false);
  const [conversionResults, setConversionResults] = useState<{
    [key: string]: string | bigint;
  }>({});

  useEffect(() => {
    try {
      const bigintValue = BigInt(value);
      const results = convertToAllUnits(bigintValue, unit);
      setConversionResults(results);
    } catch (error) {
      console.error("Failed to convert value to BigInt:", error);
      setConversionResults({});
    }
  }, [value, unit]);

  const handleClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    unit: string
  ) => {
    setAnchorEl((prev) => ({ ...prev, [unit]: event.currentTarget }));
  };

  const handleClose = (unit: string) => {
    setAnchorEl((prev) => ({ ...prev, [unit]: null }));
  };

  const unitMapping: { [key: string]: number } = {
    wei: 0,
    kwei: 3,
    mwei: 6,
    gwei: 9,
    microether: 12,
    milliether: 15,
    ether: 18,
  };

  function convertUnits(val: bigint, fromUnit: string, toUnit: string): string {
    if (!(fromUnit in unitMapping) || !(toUnit in unitMapping)) {
      throw new Error("Invalid unit provided.");
    }
    const fromUnitDecimals = unitMapping[fromUnit];
    const toUnitDecimals = unitMapping[toUnit];
    const weiValue = formatUnits(val, fromUnitDecimals);
    const result = parseUnits(weiValue, toUnitDecimals);
    return result.toString();
  }

  function convertToAllUnits(value: bigint, fromUnit: string) {
    const results: { [key: string]: string } = {};

    for (const toUnit in unitMapping) {
      if (toUnit !== fromUnit) {
        results[toUnit] = convertUnits(value, fromUnit, toUnit);
      }
    }
    return results;
  }

  const convertToHex = (value: string | bigint) => {
    const bigintValue = BigInt(value);
    return "0x" + bigintValue.toString(16);
  };

  const content = (
    <Grid container spacing={2}>
      {Object.keys(conversionResults).map((unit) => (
        <Grid item xs={12} sm={6} key={unit}>
          <Datapoint
            label={unit}
            value={
              <div style={{ display: "flex", alignItems: "center" }}>
                <ContextMenuWithTauri copy={conversionResults[unit]}>
                  {conversionResults[unit].toString()}
                </ContextMenuWithTauri>
                <IconButton
                  aria-label="transfer"
                  onClick={(event) => handleClick(event, unit)}
                >
                  <MoreVertIcon />
                </IconButton>
                <Popover
                  open={Boolean(anchorEl[unit])}
                  anchorEl={anchorEl[unit]}
                  onClose={() => handleClose(unit)}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "left",
                  }}
                >
                  <Grid container rowSpacing={1} columns={1} sx={{ p: 2 }}>
                    <Datapoint
                      label="hexadecimal"
                      value={
                        <ContextMenuWithTauri
                          copy={convertToHex(conversionResults[unit])}
                        >
                          {convertToHex(conversionResults[unit])}
                        </ContextMenuWithTauri>
                      }
                      size="small"
                    />
                    <Datapoint
                      label="decimal"
                      value={
                        <ContextMenuWithTauri copy={conversionResults[unit]}>
                          {conversionResults[unit].toString()}
                        </ContextMenuWithTauri>
                      }
                      size="small"
                    />
                  </Grid>
                </Popover>
              </div>
            }
            size="small"
          />
        </Grid>
      ))}
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
        <Modal
          open={unitValuesOpen}
          onClose={() => setUnitValuesOpen(false)}
          sx={{
            top: "50%",
            left: "50%",
            width: "auto",
          }}
        >
          {content}
        </Modal>
      </div>
    </Stack>
  );
}
