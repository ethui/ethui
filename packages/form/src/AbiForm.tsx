import { useCallback, useEffect, useState } from "react";
import { parseAbiItem, type AbiFunction, type AbiItem } from "viem";
import { encodeFunctionData } from "viem/utils";
import { Alert, Box, Button, Grid, Stack } from "@mui/material";

import { AbiInput } from "./AbiInput";
import { decodeDefaultArgs } from "./utils";

interface AbiFormProps {
  abiItem?: AbiItem | string;
  debug?: boolean;
  onChange?: (params: {
    item?: AbiFunction;
    value?: bigint;
    data?: `0x${string}`;
    args?: any[];
  }) => void;
  onSubmit?: () => void;
  submit?: boolean;
  defaultCalldata?: `0x${string}`;
  defaultEther?: bigint;
}

export type { AbiFunction };

export function AbiForm({
  abiItem,
  debug = false,
  defaultCalldata,
  defaultEther,
  onChange,
  onSubmit = () => {},
  submit = false,
}: AbiFormProps) {
  if (!abiItem || abiItem === "") {
    return (
      <RawForm
        {...{
          debug,
          onChange,
          onSubmit,
          defaultCalldata,
          defaultEther,
        }}
      />
    );
  }

  let item: AbiFunction;
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
        submit,
        item,
        debug,
        onChange,
        onSubmit,
        defaultCalldata,
        defaultEther,
      }}
    />
  );
}

type RawFormProps = Omit<AbiFormProps, "abiItem" | "debug"> & {
  debug: boolean;
};
export function RawForm({
  debug,
  onChange,
  onSubmit,
  defaultCalldata,
  defaultEther,
  submit,
}: RawFormProps) {
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
        onSubmit?.();
      }}
    >
      <AbiInput
        name="calldata"
        label="calldata"
        type="bytes"
        debug={debug}
        defaultValue={defaultCalldata}
        onChange={(e) => {
          setCalldata(e);
        }}
      />
      <AbiInput
        name="value"
        label="value"
        type="uint256"
        debug={debug}
        defaultValue={defaultEther}
        onChange={(e) => {
          setEther(e);
        }}
      />
      {onSubmit && submit && (
        <Box>
          <Button variant="contained" type="submit" disabled={!calldata}>
            Submit
          </Button>
        </Box>
      )}
    </Stack>
  );
}

type AbiFormInnerProps = Omit<AbiFormProps, "abiItem" | "debug"> & {
  item: AbiFunction;
  debug: boolean;
  onCalldataChange?: (calldata: `0x${string}`) => void;
  onValueChange?: (value: bigint) => void;
  onSubmit: () => void;
  submit: boolean;
};

export function AbiFormInner({
  item,
  debug,
  onChange: parentOnChange,
  onSubmit,
  defaultCalldata,
  defaultEther,
  submit,
}: AbiFormInnerProps) {
  const [calldata, setCalldata] = useState<`0x${string}` | undefined>(
    defaultCalldata,
  );
  const [values, setValues] = useState(
    decodeDefaultArgs(item, defaultCalldata),
  );
  const [ether, setEther] = useState<bigint | undefined>(undefined);

  const onChange = useCallback(
    (newValue: any, i: number) => {
      const newValues = [...values];
      newValues[i] = newValue;
      setValues(newValues);
    },
    [values],
  );

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
    if (!parentOnChange) return;
    parentOnChange({ item: item, data: calldata, value: ether, args: values });
  }, [item, parentOnChange, calldata, ether, values]);

  return (
    <Grid container spacing={2} onSubmit={(e) => e.preventDefault()}>
      <Stack
        component="form"
        spacing={2}
        sx={{ p: 2 }}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
      >
        {item.inputs.map((input, i) => (
          <AbiInput
            key={i}
            name={input.name || i.toString()}
            label={input.name || i.toString()}
            type={input.type}
            debug={debug}
            defaultValue={values[i]}
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
            defaultValue={defaultEther}
            onChange={(e) => {
              try {
                setEther(BigInt(e));
              } catch (e) {
                setEther(undefined);
              }
            }}
          />
        )}
        {submit && (
          <Box>
            <Button variant="contained" type="submit" disabled={!calldata}>
              Submit
            </Button>
          </Box>
        )}
      </Stack>
    </Grid>
  );
}
