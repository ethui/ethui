import { Stack, useTheme, SxProps, Box } from "@mui/material";
import { Address, Abi, AbiFunction } from "abitype";
import { formatUnits, decodeFunctionData, parseAbi } from "viem";

import { ClickToCopy, Typography } from "../";
import { PaletteColorKey } from "../../utils";

export interface SolidityCallProps {
  value?: bigint;
  data?: `0x${string}`;
  from: Address;
  to: Address;
  chainId?: number;
  decimals?: number;
  abi?: Abi | string[];
  ArgProps?: Pick<ArgProps, "addressRenderer" | "defaultRenderer">;
}

export function SolidityCall({
  value = 0n,
  data,
  from,
  to,
  chainId,
  decimals = 18,
  abi,
  ArgProps = {},
}: SolidityCallProps) {
  const theme = useTheme();
  const isCall = data && data.length > 0 && data !== "0x";

  return (
    <Box sx={{ backgroundColor: theme.palette.highlight1.main, p: 2 }}>
      {isCall && (
        <Call
          {...{
            value,
            data,
            from,
            contract: to,
            chainId,
            decimals,
            abi,
            ArgProps,
          }}
        />
      )}

      {!isCall && <Fallback {...{ value, from, to, decimals, ArgProps }} />}
    </Box>
  );
}

interface FallbackProps {
  from: Address;
  to: Address;
  value: bigint;
  decimals: number;
  ArgProps?: Pick<ArgProps, "addressRenderer" | "defaultRenderer">;
}

function Fallback({ value, from, to, decimals, ArgProps }: FallbackProps) {
  return (
    <Stack direction="row" spacing={0.5}>
      <Typography mono>Sending</Typography>
      <Arg
        label="Ξ"
        type="uint256"
        {...ArgProps}
        value={formatUnits(value, decimals)}
        variant="primary"
      />
      <Arg
        variant="highlight4"
        label="from"
        type="address"
        {...ArgProps}
        value={from}
      />
      <Arg
        variant="highlight4"
        label="to"
        type="address"
        {...ArgProps}
        value={to}
      />
    </Stack>
  );
}

interface CallProps {
  value: bigint;
  data: `0x${string}`;
  contract: Address;
  chainId?: number;
  decimals: number;
  abi?: Abi | string[];
  ArgProps: Pick<ArgProps, "addressRenderer">;
}

function Call({ value, data, contract, decimals, abi, ArgProps }: CallProps) {
  const { label, args } = parseCall(data, abi);

  return (
    <Stack spacing={0.5}>
      <Stack direction="row">
        <Arg
          type="address"
          variant="highlight2"
          value={contract}
          {...ArgProps}
        />
        <Separator text="." sx={{ gridArea: "top" }} />
        <Arg value={label} type="string" variant="highlight3" />
        {value > 0n && (
          <>
            <Separator text="{" />
            <Arg
              label="Ξ"
              type="uint256"
              variant="highlight4"
              {...ArgProps}
              value={formatUnits(value, decimals)}
            />
            <Separator text="}" />
          </>
        )}
        <Separator text="(" />
      </Stack>
      <Stack spacing={0.5}>
        {[...args].map(({ value, type, label }, i) => (
          <Stack direction="row" key={i} pl={4}>
            <Arg
              variant="highlight4"
              {...{ label, value, type }}
              {...ArgProps}
            />
            {i! < args.length - 1 && <Separator text="," />}
          </Stack>
        ))}
      </Stack>
      <Separator text=")" />
    </Stack>
  );
}

interface ArgProps {
  label?: string;
  variant?: PaletteColorKey;
  type: string;
  sx?: SxProps;
  value: string | bigint;
  addressRenderer?: (a: Address) => React.ReactNode;
  defaultRenderer?: (a: string | bigint) => React.ReactNode;
}

function Arg({
  label,
  type,
  variant = "highlight1",
  value,
  sx = {},
  addressRenderer,
  defaultRenderer = (v: string | bigint) => (
    <ClickToCopy text={v}>
      <Typography mono>{v.toString()}</Typography>
    </ClickToCopy>
  ),
}: ArgProps) {
  const theme = useTheme();

  return (
    <Stack
      direction="row"
      sx={{
        color: theme.palette[variant].main,
        transition: theme.transitions.create(["background-color", "color"]),
        "&:hover": {
          color: theme.palette[variant].contrastText,
          backgroundColor: theme.palette[variant].main,
        },
        ...sx,
      }}
    >
      {label && (
        <Typography
          sx={{ flexShrink: 0, color: theme.palette.text.primary }}
          mono
        >
          {label}&nbsp;
        </Typography>
      )}
      {type === "address" && !!addressRenderer
        ? addressRenderer(value as Address)
        : defaultRenderer(value)}
    </Stack>
  );
}

interface SeparatorProps {
  text: string;
  sx?: SxProps;
}

function Separator({ text, sx }: SeparatorProps) {
  return (
    <Typography mono sx={sx}>
      {text}
    </Typography>
  );
}

function parseCall(data: `0x${string}`, abi: Abi | string[] | undefined) {
  const parsedAbi = !abi
    ? []
    : typeof abi[0] === "string"
      ? parseAbi(abi as string[])
      : (abi as Abi);

  let label = data.slice(0, 10);
  let args = [
    { value: `0x${data.slice(8)}`, type: "string", label: "calldata:" },
  ];

  try {
    const decoded = decodeFunctionData({
      abi: parsedAbi || [],
      data,
    });

    const item = parsedAbi?.find(
      (i) => i.type == "function" && i.name === decoded?.functionName,
    ) as AbiFunction;

    args = (decoded.args ?? []).map((arg, i) => {
      const type = item.inputs[i].type;
      const label = `${item.inputs[i].name}:`;

      return { value: arg as string, type, label };
    });

    label = decoded?.functionName;
    console.log(args);
  } catch (e) {
    console.log(e);
  }

  return { label, args };
}
