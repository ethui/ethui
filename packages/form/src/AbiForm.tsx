import { useEffect, useState } from "react";
import { parseAbiItem, type AbiFunction, type AbiItem } from "viem";
import { encodeFunctionData } from "viem/utils";
import { Alert, Box, Button, Grid, Stack } from "@mui/material";

import { AbiInput } from "./AbiInput";

interface AbiFormProps {
  abiItem?: AbiItem | string;
  preview?: boolean;
  debug?: boolean;
  onCalldataChange?: (calldata: `0x${string}`) => void;
  onValueChange?: (value: bigint) => void;
  onSubmit?: () => void;
}

export function AbiForm({
  abiItem,
  debug = false,
  preview,
  onCalldataChange,
  onValueChange,
  onSubmit = () => {},
}: AbiFormProps) {
  if (!abiItem || abiItem === "") {
    return (
      <RawForm
        {...{
          debug,
          preview,
          onCalldataChange,
          onValueChange,
          onSubmit,
        }}
      />
    );
  }

  let item;
  try {
    item = (
      typeof abiItem === "string" ? parseAbiItem(abiItem) : abiItem
    ) as AbiFunction;
  } catch (e: any) {
    const msg = e.message.replace(/Version: abitype.*$/, "");
    return <Alert severity="error">{msg}</Alert>;
  }

  return (
    <AbiFormInner
      {...{ item, debug, preview, onCalldataChange, onValueChange, onSubmit }}
    />
  );
}

type RawFormProps = Omit<AbiFormProps, "abiItem" | "debug"> & {
  debug: boolean;
};
export function RawForm({
  debug,
  onCalldataChange,
  onValueChange,
  onSubmit,
}: RawFormProps) {
  const [calldata, setCalldata] = useState<`0x${string}`>("0x");
  const [ether, setEther] = useState<bigint>(0n);

  useEffect(() => {
    if (!onCalldataChange) return;
    onCalldataChange(calldata);
  }, [calldata, onCalldataChange]);

  useEffect(() => {
    if (!onValueChange) return;
    onValueChange(ether);
  }, [ether, onValueChange]);

  return (
    <Stack
      component="form"
      spacing={2}
      sx={{ p: 2 }}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit && onSubmit();
      }}
    >
      <AbiInput
        name="calldata"
        label="calldata"
        type="bytes"
        debug={debug}
        depth={1}
        onChange={(e) => {
          setCalldata(e);
        }}
      />
      <AbiInput
        name="value"
        label="value"
        type="uint256"
        debug={debug}
        depth={1}
        onChange={(e) => {
          setEther(e);
        }}
      />
      <Box>
        <Button variant="contained" type="submit" disabled={!calldata}>
          Submit
        </Button>
      </Box>
    </Stack>
  );
}

type AbiFormInnerProps = Omit<AbiFormProps, "abiItem" | "debug"> & {
  item: AbiFunction;
  debug: boolean;
  onCalldataChange?: (calldata: `0x${string}`) => void;
  onValueChange?: (value: bigint) => void;
  onSubmit: () => void;
};

export function AbiFormInner({
  item,
  debug,
  preview,
  onCalldataChange,
  onValueChange,
  onSubmit,
}: AbiFormInnerProps) {
  const [calldata, setCalldata] = useState<`0x${string}` | undefined>();
  const [values, setValues] = useState(
    Array(item.inputs.length).fill(undefined),
  );
  const [ether, setEther] = useState<bigint | undefined>(undefined);

  const onChange = (newValue: any, i: number) => {
    const newValues = [...values];
    newValues[i] = newValue;
    setValues(newValues);
  };

  useEffect(() => {
    try {
      const encoded = encodeFunctionData({
        abi: [item],
        functionName: item.name,
        args: values,
      });
      setCalldata(encoded);
    } catch (e) {
      setCalldata(undefined);
    }
  }, [values, item]);

  useEffect(() => {
    if (!calldata || !onCalldataChange) return;
    onCalldataChange(calldata);
  }, [calldata, onCalldataChange]);

  useEffect(() => {
    if (!ether || !onValueChange) return;
    onValueChange(ether);
  }, [ether, onValueChange]);

  return (
    <Grid container spacing={2} onSubmit={(e) => e.preventDefault()}>
      <Grid item xs={12} md={preview ? 4 : 12}>
        <Stack
          component="form"
          spacing={2}
          sx={{ p: 2 }}
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit && onSubmit();
          }}
        >
          {item.inputs.map((input, i) => (
            <AbiInput
              key={i}
              name={input.name || i.toString()}
              label={input.name || i.toString()}
              type={input.type}
              debug={debug}
              depth={1}
              onChange={(e) => {
                onChange(e, i);
              }}
            />
          ))}
          {item.stateMutability === "payable" && (
            <AbiInput
              name="value"
              label="value"
              type="uint256"
              debug={debug}
              depth={1}
              onChange={(e) => {
                try {
                  setEther(BigInt(e));
                } catch (e) {
                  setEther(undefined);
                }
              }}
            />
          )}
          <Box>
            <Button variant="contained" type="submit" disabled={!calldata}>
              Submit
            </Button>
          </Box>
        </Stack>
      </Grid>
    </Grid>
  );
}
