import { Stack, Box, useTheme, SxProps } from "@mui/material";
import { Address, Abi, AbiFunction } from "abitype";
import { Fragment } from "react";
import { formatUnits, decodeFunctionData, parseAbi } from "viem";

import { Typography } from "../";

export interface SolidityCallProps {
  value?: bigint;
  data: `0x${string}`;
  to: Address;
  chainId?: number;
  decimals?: number;
  abi?: Abi | string[];
  ArgProps?: Pick<ArgProps, "addressRenderer" | "defaultRenderer">;
}

export function SolidityCall({
  value = 0n,
  data,
  to,
  chainId,
  decimals = 18,
  abi,
  ArgProps = {},
}: SolidityCallProps) {
  if (!data || data.length === 0) {
    return <Fallback {...{ value, to, decimals, ArgProps }} />;
  } else {
    const parsedAbi = !abi
      ? []
      : typeof abi[0] === "string"
        ? parseAbi(abi as string[])
        : (abi as Abi);

    return (
      <Call
        {...{
          value,
          data,
          contract: to,
          chainId,
          decimals,
          abi: parsedAbi,
          ArgProps,
        }}
      />
    );
  }
}

interface FallbackProps {
  value: bigint;
  to: Address;
  decimals: number;
  ArgProps: Pick<ArgProps, "addressRenderer">;
}

function Fallback({ value, to, decimals, ArgProps }: FallbackProps) {
  return (
    <Stack direction="row" spacing={1}>
      <Typography mono>Sending</Typography>
      <Arg
        name="Ξ"
        type="uint256"
        {...ArgProps}
        value={formatUnits(value, decimals)}
      />
      <Arg name="to" type="address" {...ArgProps} value={to} />
    </Stack>
  );
}

interface CallProps {
  value: bigint;
  data: `0x${string}`;
  contract: Address;
  chainId?: number;
  decimals: number;
  abi?: Abi;
  ArgProps: Pick<ArgProps, "addressRenderer">;
}

function Call({ value, data, contract, decimals, abi, ArgProps }: CallProps) {
  const theme = useTheme();

  let label = data.slice(0, 8);
  let args: { value: string | bigint; type: string; name: string }[] = [
    { value: data, type: "string", name: "calldata" },
  ];

  try {
    const decoded = decodeFunctionData({
      abi: abi || [],
      data,
    });

    const item = abi?.find(
      (i) => i.type == "function" && i.name === decoded?.functionName,
    ) as AbiFunction;

    args = (decoded.args ?? []).map((arg, i) => {
      const type = item.inputs[i].type;
      const name = item.inputs[i].name;

      return { value: arg as string, type, name: name || "" };
    });

    label = decoded?.functionName;
    console.log(args);
  } catch (e) {
    console.log(e);
  }

  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        backgroundColor: theme.palette.highlight1.main,
        px: 2,
        py: 1,
        fontFamily: "monospace",
      }}
    >
      <Arg
        type="address"
        color={theme.palette.highlight2.main}
        {...ArgProps}
        value={contract}
      />
      <Separator text="." />
      <Box sx={{ backgroundColor: theme.palette.highlight3.main, px: 1 }}>
        <Typography mono>{label}</Typography>
      </Box>
      {value > 0n && (
        <>
          <Separator text="{" />
          <Arg
            name="Ξ"
            type="uint256"
            color={theme.palette.highlight3.main}
            {...ArgProps}
            value={formatUnits(value, decimals)}
          />
          <Separator text="}" />
        </>
      )}
      <Separator text="(" />
      {[...args].map(({ value, type, name }, i) => (
        <Fragment key={i}>
          {i! > 0 && <Separator text="," />}
          <Arg
            {...{ name, value, type, color: theme.palette.highlight4.main }}
            {...ArgProps}
          />
        </Fragment>
      ))}
      <Separator text=")" />
    </Stack>
  );
}

interface ArgProps {
  name?: string;
  color?: string;
  type: string;
  sx?: SxProps;
  value: string | bigint;
  addressRenderer?: (a: Address) => React.ReactNode;
  defaultRenderer?: (a: string | bigint) => React.ReactNode;
}

function Arg({
  name,
  type,
  color = "highligth1",
  value,
  sx = {},
  addressRenderer,
  defaultRenderer = (v: string | bigint) => (
    <Typography mono>{v.toString()}</Typography>
  ),
}: ArgProps) {
  return (
    <Stack direction="row" sx={{ backgroundColor: color, px: 0.5, ...sx }}>
      {name && <Typography mono>{name}:&nbsp;</Typography>}
      {type === "address" && !!addressRenderer
        ? addressRenderer(value as Address)
        : defaultRenderer(value)}
    </Stack>
  );
}

interface SeparatorProps {
  text: string;
}

function Separator({ text }: SeparatorProps) {
  return (
    <Typography mono sx={{ px: 0.5 }}>
      {text}
    </Typography>
  );
}
