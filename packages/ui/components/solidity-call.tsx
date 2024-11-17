import type { Abi, AbiFunction, Address } from "abitype";
import { decodeFunctionData, formatUnits, parseAbi } from "viem";

import clsx from "clsx";
import { ClickToCopy } from "./click-to-copy";

export interface SolidityCallProps {
  value?: string | bigint;
  data?: `0x${string}`;
  from: Address;
  to?: Address;
  chainId?: number;
  decimals?: number;
  abi?: Abi | string[];
  ArgProps?: Pick<ArgProps, "addressRenderer" | "defaultRenderer">;
}

export function SolidityCall({
  value: valueStr = 0n,
  data,
  from,
  to,
  chainId,
  decimals = 18,
  abi,
  ArgProps = {},
}: SolidityCallProps) {
  const isDeploy = !to && !!data;
  const isCall = to && !!data && data.length > 0 && data !== "0x";
  const isFallback = !!to && (!data || data === "0x");
  const value = BigInt(valueStr);

  return (
    <>
      {isDeploy && <Deploy {...{ from, data, value, decimals, ArgProps }} />}
      {isCall && (
        <Call
          {...{
            value,
            data,
            from,
            to,
            chainId,
            decimals,
            abi,
            ArgProps,
          }}
        />
      )}

      {isFallback && <Fallback {...{ value, from, to, decimals, ArgProps }} />}
    </>
  );
}

interface DeployProps {
  from: Address;
  data: `0x${string}`;
  value: bigint;
  decimals: number;
  ArgProps?: Pick<ArgProps, "addressRenderer" | "defaultRenderer">;
}

function Deploy({ value, from, decimals, ArgProps }: DeployProps) {
  return (
    <>
      <div className="flex gap-x-1">
        <Arg
          label="Ξ"
          type="uint256"
          {...ArgProps}
          value={formatUnits(value, decimals)}
          variant="value"
        />
        <Arg
          label="from"
          type="address"
          {...ArgProps}
          value={from}
          variant="caller"
        />
        <span className="font-mono">to newly deployed contract</span>
      </div>
    </>
  );
}

interface FallbackProps {
  from: Address;
  to: Address;
  value: string | bigint;
  decimals: number;
  ArgProps?: Pick<ArgProps, "addressRenderer" | "defaultRenderer">;
}

function Fallback({ value, from, to, decimals, ArgProps }: FallbackProps) {
  return (
    <div className="flex gap-1">
      <Arg
        label="Ξ"
        type="uint256"
        value={formatUnits(BigInt(value), decimals)}
        variant="caller"
      />
      <Arg
        label="from"
        type="address"
        {...ArgProps}
        value={from}
        variant="value"
      />
      <Arg
        label="to"
        type="address"
        {...ArgProps}
        value={to}
        variant="callname"
      />
    </div>
  );
}

interface CallProps {
  value: bigint;
  data: `0x${string}`;
  to: Address;
  chainId?: number;
  decimals: number;
  abi?: Abi | string[];
  ArgProps: Pick<ArgProps, "addressRenderer">;
}

function Call({ value, data, to, decimals, abi, ArgProps }: CallProps) {
  const { label, args } = parseCall(data, abi);

  return (
    <div>
      <div className="flex items-baseline">
        <Arg type="address" variant="caller" value={to} {...ArgProps} />
        <Separator text="." />
        <Arg value={label} raw type="string" variant="callname" />
        {value > 0n && (
          <>
            <Separator text="{" />
            <Arg
              label="Ξ"
              type="uint256"
              variant="arg"
              {...ArgProps}
              value={formatUnits(value, decimals)}
            />
            <Separator text="}" />
          </>
        )}
        <Separator text="(" />
      </div>
      <div>
        {[...args].map(({ value, type, label }, i) => (
          <div className="flex pl-8" key={i}>
            <Arg variant="arg" {...{ label, value, type }} {...ArgProps} />
            {i! < args.length - 1 && <Separator text="," />}
          </div>
        ))}
      </div>
      <Separator text=")" />
    </div>
  );
}

interface ArgProps {
  label?: string;
  type: string;
  raw?: boolean;
  value: string | bigint;
  addressRenderer?: (a: Address) => React.ReactNode;
  defaultRenderer?: (a: string | bigint) => React.ReactNode;
  variant: "caller" | "value" | "arg" | "callname";
}

function Arg({
  label,
  type,
  raw = false,
  value,
  variant,
  addressRenderer,
  defaultRenderer = (v: string | bigint) => (
    <ClickToCopy text={v}>
      <span className="font-mono">
        {raw && v.toString()}
        {!raw &&
          JSON.stringify(v, (_k, v) => {
            return typeof v === "bigint" ? `0x${v.toString(16)}` : v;
          })}
      </span>
    </ClickToCopy>
  ),
}: ArgProps) {
  const variants = {
    caller: "text-solidity-caller hover:text-white hover:bg-solidity-caller",
    value: "text-solidity-value hover:text-white hover:bg-solidity-value",
    callname:
      "text-solidity-callname hover:text-white hover:bg-solidity-callname",
    arg: "text-solidity-arg hover:text-white hover:bg-solidity-arg",
  };

  return (
    <div className={clsx("flex items-baseline px-1 py-0.5", variants[variant])}>
      {label && (
        <span className="mr-1 shrink-0 font-mono text-primary-background">
          {label}
        </span>
      )}
      {type === "address" && !!addressRenderer
        ? addressRenderer(value as Address)
        : defaultRenderer(value)}
    </div>
  );
}

interface SeparatorProps {
  text: string;
  className?: string;
}

function Separator({ text, className }: SeparatorProps) {
  return <span className={`${className} font-mono`}>{text}</span>;
}

function parseCall(data: `0x${string}`, abi: Abi | string[] | undefined) {
  const parsedAbi = !abi
    ? []
    : typeof abi[0] === "string"
      ? parseAbi(abi as string[])
      : (abi as Abi);

  let label = data.slice(0, 10);
  let args = [
    { value: `0x${data.slice(10)}`, type: "string", label: "calldata:" },
  ];

  try {
    const decoded = decodeFunctionData({
      abi: parsedAbi || [],
      data,
    });

    const item = parsedAbi?.find(
      (i) => i.type === "function" && i.name === decoded?.functionName,
    ) as AbiFunction;

    args = (decoded.args ?? []).map((arg, i) => {
      const type = item.inputs[i].type;
      const label = `${item.inputs[i].name}:`;

      return { value: arg as string, type, label };
    });

    label = decoded?.functionName;
  } catch (e) {
    console.log(e);
  }

  return { label, args };
}
