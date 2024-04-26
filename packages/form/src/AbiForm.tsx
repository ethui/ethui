import { useEffect, useState } from "react";
import { parseAbiItem, type AbiFunction, type AbiItem } from "viem";
import { encodeFunctionData } from "viem/utils";
import { Alert, Box, Button, Grid, Stack } from "@mui/material";

import { AbiInput } from "./AbiInput";

interface AbiFormProps {
  abiItem?: AbiItem | string;
  preview?: boolean;
  debug?: boolean;
  onChange?: (params: {
    value?: bigint;
    data?: `0x${string}`;
    args?: any[];
  }) => void;
  onSubmit?: () => void;
}

export function AbiForm({
  abiItem,
  debug = false,
  preview,
  onChange,
  onSubmit = () => {},
}: AbiFormProps) {
  if (!abiItem || abiItem === "") {
    return (
      <RawForm
        {...{
          debug,
          preview,
          onChange,
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
      {...{
        item,
        debug,
        preview,
        onChange,
        onSubmit,
      }}
    />
  );
}

type RawFormProps = Omit<AbiFormProps, "abiItem" | "debug"> & {
  debug: boolean;
};
export function RawForm({ debug, onChange, onSubmit }: RawFormProps) {
  const [calldata, setCalldata] = useState<`0x${string}`>("0x");
  const [ether, setEther] = useState<bigint>(0n);

  useEffect(() => {
    if (!onChange) return;
    onChange({ data: calldata, value: ether });
  }, [onChange, calldata, ether]);

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
  onChange: parentOnChange,
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
    if (!parentOnChange) return;
    parentOnChange({ data: calldata, value: ether, args: values });
  }, [parentOnChange, calldata, ether, values]);

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

  return (
    <Grid container spacing={2} onSubmit={(e) => e.preventDefault()}>
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
  );
}
