import { Grid, IconButton, Popover, Stack, Tooltip } from "@mui/material";
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
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
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

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const unitMapping: { [key: string]: number } = {
    wei: 0,
    kwei: 3,
    babbage: 3,
    mwei: 6,
    lovelace: 6,
    gwei: 9,
    shannon: 9,
    microether: 12,
    szabo: 12,
    milliether: 15,
    finney: 15,
    ether: 18,
    eth: 18,
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
        <Grid item xs={12} sm={6} md={4} lg={3} key={unit}>
          <Datapoint
            label={unit}
            value={
              <div style={{ display: "flex", alignItems: "center" }} key={unit}>
                <ContextMenuWithTauri copy={conversionResults[unit]}>
                  {conversionResults[unit].toString()}
                </ContextMenuWithTauri>
                <IconButton aria-label="transfer" onClick={handleClick}>
                  <MoreVertIcon />
                </IconButton>
                <Popover
                  key={unit}
                  open={open}
                  anchorEl={anchorEl}
                  onClose={handleClose}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "left",
                  }}
                >
                  <Grid container key={unit} rowSpacing={1} columns={1} sx={{ p: 2 }}>
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
