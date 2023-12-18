import { Stack, Box, useTheme } from "@mui/material";
import { Address, Abi, AbiFunction } from "abitype";
import { useState, useEffect, Fragment } from "react";
import { formatUnits, decodeFunctionData } from "viem";

import { useInvoke } from "@/hooks";
import { AddressView, MonoText } from "./";

interface SummaryProps {
  value?: bigint;
  data: `0x${string}`;
  to: Address;
  chainId?: number;
  decimals?: number;
}

export function HumanReadableCall({
  value = 0n,
  data,
  to,
  chainId,
  decimals = 18,
}: SummaryProps) {
  if (!data || data.length === 0) {
    return <SummaryBase {...{ value, to, decimals }} />;
  } else {
    return (
      <SummaryFunction {...{ value, data, contract: to, chainId, decimals }} />
    );
  }
}

interface SummaryBaseProps {
  value: bigint;
  to: Address;
  decimals: number;
}

function SummaryBase({ value, to, decimals }: SummaryBaseProps) {
  return (
    <Stack direction="row" spacing={1}>
      <MonoText>Sending</MonoText>
      <Arg name="Ξ" type="bigint" value={formatUnits(value, decimals)} />
      <Arg name="to" type="address" value={to} />
    </Stack>
  );
}

interface SummaryFunctionProps {
  value: bigint;
  data: `0x${string}`;
  contract: Address;
  chainId?: number;
  decimals: number;
}

function SummaryFunction({
  value,
  data,
  contract,
  chainId,
  decimals,
}: SummaryFunctionProps) {
  const { data: abi } = useInvoke<Abi>("get_contract_abi", {
    address: contract,
    chainId,
  });
  const theme = useTheme();

  const [label, setLabel] = useState<string>(data);
  const [args, setArgs] = useState<[string, string, string][]>([]);

  useEffect(() => {
    if (!abi) return;
    const decoded = decodeFunctionData({
      abi: abi || [],
      data,
    });

    const item = abi?.find(
      (i) => i.type == "function" && i.name === decoded?.functionName,
    ) as AbiFunction;

    const args: [string, string, string][] = (decoded.args ?? []).map(
      (arg, i) => {
        const type = item.inputs[i].type;
        const name = item.inputs[i].name;

        return [arg as string, type, name || ""];
      },
    );

    setLabel(decoded?.functionName);
    setArgs(args);
  }, [abi, data]);

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
        value={contract}
        type="address"
        color={theme.palette.highlight2.main}
      />
      <MonoText>.</MonoText>
      <Box sx={{ backgroundColor: theme.palette.highlight3.main, px: 1 }}>
        <MonoText>{label}</MonoText>
      </Box>
      {value > 0n && (
        <>
          <MonoText>{"{"}</MonoText>
          <Arg
            name="Ξ"
            type="bigint"
            value={formatUnits(value, decimals)}
            color={theme.palette.highlight3.main}
          />
          <MonoText>{"}"}</MonoText>
        </>
      )}
      <MonoText>(</MonoText>
      {[...args, ...args].map(([value, type, name], i) => (
        <Fragment key={i}>
          {i! > 0 && <MonoText sx={{ px: 1 }}>,</MonoText>}
          <Arg
            {...{ name, value, type, color: theme.palette.highlight4.main }}
          />
        </Fragment>
      ))}
      <MonoText>)</MonoText>
    </Stack>
  );
}

interface ArgProps {
  name?: string;
  value: Address | string | bigint;
  type: string;
  color: string;
}

function Arg({ name, type, value, color }: ArgProps) {
  return (
    <Stack direction="row" sx={{ backgroundColor: color, px: 1 }}>
      {name && <MonoText>{name}:&nbsp;</MonoText>}
      {type === "address" ? (
        <AddressView mono address={value as Address} />
      ) : (
        value.toString()
      )}
    </Stack>
  );
}
