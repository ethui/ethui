import {
  SolidityCall,
  type SolidityCallProps,
} from "@ethui/ui/components/solidity-call";
import { cn } from "@ethui/ui/lib/utils";
import type { AbiFunction, Address } from "abitype";
import { useCallback, useState } from "react";
import { AbiItemForm } from "./AbiItemForm";

interface AbiItemFormWithPreview {
  abiFunction: AbiFunction | "raw" | "rawCall";
  address: Address;
  sender?: Address;
  chainId: number;
  defaultCalldata?: `0x${string}`;
  defaultEther?: bigint;
  onChange?: (params: { value?: bigint; data?: `0x${string}` }) => void;
  ArgProps?: SolidityCallProps["ArgProps"];
}

export function AbiItemFormWithPreview({
  abiFunction,
  address,
  sender,
  chainId,
  defaultCalldata,
  defaultEther,
  onChange: parentOnChange,
  ArgProps,
}: AbiItemFormWithPreview) {
  const [value, setValue] = useState<bigint | undefined>(defaultEther);
  const [data, setData] = useState<`0x${string}` | undefined>(defaultCalldata);
  const showForm =
    abiFunction === "raw" ||
    abiFunction === "rawCall" ||
    abiFunction.inputs.length > 0;

  const onChange = useCallback(
    ({ value, data }: { value?: bigint; data?: `0x${string}` }) => {
      setValue(value);
      setData(data);
      parentOnChange?.({ value, data });
    },
    [parentOnChange],
  );

  return (
    <div className="grid grid-cols-3 gap-2">
      <div
        className={cn(
          "col-span-3",
          showForm ? "md:col-span-1" : "md:col-span-0",
        )}
      >
        <AbiItemForm
          item={abiFunction}
          onChange={onChange}
          defaultEther={defaultEther}
          defaultCalldata={defaultCalldata}
        />
      </div>
      <div className={cn("col-span-3", showForm && "md:col-span-2")}>
        {data && sender && (
          <SolidityCall
            {...{
              value,
              data,
              from: sender,
              to: address,
              abi:
                abiFunction !== "raw" && abiFunction !== "rawCall"
                  ? [abiFunction]
                  : [],
              chainId,
              ArgProps,
            }}
          />
        )}
      </div>
    </div>
  );
}
