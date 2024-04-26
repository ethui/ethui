import { useEffect, useState } from "react";
import { parseAbiItem, type AbiFunction, type AbiItem } from "viem";
import { encodeFunctionData } from "viem/utils";
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { AbiInput } from "./AbiInput";
import { Debug } from "./utils";

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
  });

  useEffect(() => {
    if (!onValueChange) return;
    onValueChange(ether);
  });

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
  });

  return (
    <Grid container spacing={2} onSubmit={(e) => e.preventDefault()}>
      <Grid component="form" item xs={12} md={preview ? 4 : 12}>
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
                const newValues = [...values];
                newValues[i] = e;
                setValues(newValues);
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
      {preview && (
        <Grid item xs={12} md={8}>
          <Paper sx={{ width: "100%", height: "100%" }}>
            <Stack spacing={1} sx={{ p: 2 }}>
              {item.inputs.map((input, i) => (
                <div key={i}>
                  <Typography fontWeight="bold">
                    {input.name || i.toString()}:
                  </Typography>
                  <Debug value={values[i]} />
                </div>
              ))}
              <Typography fontWeight="bold">calldata:</Typography>
              <Typography fontFamily="mono" sx={{ overflowWrap: "break-word" }}>
                {calldata}
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
}
