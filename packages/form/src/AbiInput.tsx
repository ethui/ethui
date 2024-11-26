import clsx from "clsx";
import { useCallback } from "react";

import { ArrayInput } from "./ArrayInput";
import { Basic } from "./Basic";
import { matchArrayType } from "./utils";

export interface BaseProps {
  name: string;
  type: string;
  label: string;
  debug: boolean;
  defaultValue?: any;
  onChange: (v: any) => void;
  headerActions?: React.ReactNode;
}

export type InnerProps = BaseProps & { depth?: number };

export type AbiInputProps = InnerProps & {
  red?: boolean;
  deleteHover?: boolean;
};

export function AbiInput({
  label,
  type,
  onChange: parentOnChange,
  headerActions,
  red = false,
  deleteHover = false,
  ...rest
}: AbiInputProps) {
  const arrayMatch = matchArrayType(type);

  const onChange = useCallback(
    (v: any) => {
      parentOnChange(v);
    },
    [parentOnChange],
  );

  return (
    <div className={clsx("w-full pl-1", red && deleteHover && "bg-red-500")}>
      <div>
        <div className=" flex items-center justify-between">
          <span className="font-bold">
            {label}
            <span className="pl-2 font-mono">{type}</span>
          </span>
          {headerActions}
        </div>
        {arrayMatch ? (
          <ArrayInput
            {...{
              label,
              baseType: arrayMatch.base,
              subArrays: arrayMatch.subarrays,
              type,
              onChange,
              length: arrayMatch.length,
              ...rest,
            }}
          />
        ) : (
          <Basic {...{ type, onChange, ...rest }} />
        )}
      </div>
    </div>
  );
}
