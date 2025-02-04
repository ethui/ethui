import { type AbiFunction, decodeFunctionData } from "viem";

export function Debug({ value }: { value: any }) {
  return <span className="font-mono">{stringify(value)}</span>;
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
    length: length ? Number.parseInt(length) : undefined,
    base: type.substring(0, type.length - groups.arrays.length),
    subarrays,
  };
}

export function decodeDefaultArgs(
  item: AbiFunction,
  calldata?: `0x${string}`,
): any[] {
  if (!calldata) return Array(item.inputs.length).fill(undefined);

  try {
    const { args } = decodeFunctionData({
      abi: [item],
      data: calldata,
    });
    return [...args];
  } catch (_e) {
    return Array(item.inputs.length).fill(undefined);
  }
}
