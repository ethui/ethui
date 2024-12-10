import {
  SolidityCall,
  type SolidityCallProps,
} from "@ethui/ui/components/solidity-call";
import type { AbiFunction, Address } from "abitype";
import { clsx } from "clsx";
import { useCallback, useState } from "react";
import { AbiItemForm } from "./AbiItemForm";

interface AbiItemFormWithPreview {
  abiFunction: AbiFunction | "raw";
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
  const showForm = abiFunction === "raw" || abiFunction.inputs.length > 0;

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
        className={clsx(
          "col-span-3",
          showForm ? "md:col-span-1" : "md-col-span-0",
        )}
      >
        <AbiItemForm
          item={abiFunction}
          onChange={onChange}
          defaultEther={defaultEther}
          defaultCalldata={defaultCalldata}
        />
      </div>
      <div
        className={clsx(
          "col-span-3",
          showForm ? "md:col-span-2" : "md:col-span-3",
        )}
      >
        {data && sender && (
          <SolidityCall
            {...{
              value,
              data,
              from: sender,
              to: address,
              abi: abiFunction !== "raw" ? [abiFunction] : [],
              chainId,
              ArgProps,
            }}
          />
        )}
      </div>
    </div>
  );
}
