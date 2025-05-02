import { useCallback } from "react";
import { cn } from "@ethui/ui/lib/utils";

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
  className?: string;
};

export function AbiInput({
  label,
  type,
  onChange: parentOnChange,
  headerActions,
  red = false,
  deleteHover = false,
  className,
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
    <div className={cn("w-full transition-colors", className)}>
      <div>
        <div className=" flex items-center justify-between">
          <div className="flex gap-2">
            <span className="font-bold">{label}</span>
            <span className="font-mono">{type}</span>
          </div>
          <span className="justify-self-end">{headerActions}</span>
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
