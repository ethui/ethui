import { Typography } from "@mui/material";

export function Debug({ value }: { value: any }) {
  return <Typography fontFamily="mono">{stringify(value)}</Typography>;
}

export function stringify(v: any, indent = 2) {
  const res = JSON.stringify(
    v,
    (_k, v) => {
      return typeof v === "bigint" ? `0x${v.toString(16)}` : v;
    },
    indent,
  );

  return res?.replace(/^"/, "").replace(/"$/, "");
}

export function matchArrayType(type: string) {
  const match = /(?<arrays>(\[\d*\])+)$/.exec(type);

  if (!match) return null;

  const groups = match.groups!;

  const first = /^\[(?<length>\d*)\](?<subarrays>.*)/.exec(groups.arrays);

  const { length, subarrays } = first!.groups!;

  return {
    length: length ? parseInt(length) : undefined,
    base: type.substring(0, type.length - groups.arrays.length),
    subarrays,
  };
}
