import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@ethui/ui/components/shadcn/alert";
import { useCallback, useEffect, useState } from "react";
import { type AbiFunction, parseAbiItem } from "viem";
import { encodeFunctionData } from "viem/utils";

import { Button } from "@ethui/ui/components/shadcn/button";
import { AbiInput } from "./AbiInput";
import { decodeDefaultArgs } from "./utils";

interface AbiItemFormProps {
  item?: AbiFunction | "raw";
  debug?: boolean;
  onChange?: (params: {
    item?: AbiFunction;
    value?: bigint;
    data?: `0x${string}`;
    args?: any[];
  }) => void;
  onSubmit?: () => void;
  submit?: boolean;
  defaultCalldata?: `0x${string}`;
  defaultEther?: bigint;
}

export type { AbiFunction };

export function AbiItemForm({
  item: abiItem,
  debug = false,
  defaultCalldata,
  defaultEther,
  onChange,
  onSubmit = () => { },
  submit = false,
}: AbiItemFormProps) {
  if (!abiItem || abiItem === "raw") {
    return (
      <RawItemForm
        {...{
          debug,
          onChange,
          onSubmit,
          defaultCalldata,
          defaultEther,
        }}
      />
    );
  }

  let item: AbiFunction;
  try {
    item = (
      typeof abiItem === "string" ? parseAbiItem(abiItem) : abiItem
    ) as AbiFunction;
  } catch (e: any) {
    const msg = e.message.replace(/Version: abitype.*$/, "");
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{msg}</AlertDescription>
      </Alert>
    );
  }

  return (
    <AbiItemFormInner
      {...{
        submit,
        item,
        debug,
        onChange,
        onSubmit,
        defaultCalldata,
        defaultEther,
      }}
    />
  );
}

type RawItemFormProps = Omit<AbiItemFormProps, "abiItem" | "debug"> & {
  debug: boolean;
};
export function RawItemForm({
  debug,
  onChange,
  onSubmit,
  defaultCalldata,
  defaultEther,
  submit,
}: RawItemFormProps) {
  const [calldata, setCalldata] = useState<`0x${string}`>("0x");
  const [ether, setEther] = useState<bigint>(0n);

  useEffect(() => {
    if (!onChange) return;
    onChange({ data: calldata, value: ether });
  }, [onChange, calldata, ether]);

  return (
    <form
      className="grid grid-cols-3 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <AbiInput
        name="calldata"
        label="calldata"
        type="bytes"
        debug={debug}
        defaultValue={defaultCalldata}
        onChange={(e) => {
          setCalldata(e);
        }}
      />
      <div className="col-span-2">
        <AbiInput
          name="value"
          label="value"
          type="uint256"
          debug={debug}
          defaultValue={defaultEther}
          onChange={(e) => {
            setEther(e);
          }}
        />
      </div>
      {onSubmit && submit && (
        <div className="col-start-1">
          <Button type="submit" disabled={!calldata}>
            Submit
          </Button>
        </div>
      )}
    </form>
  );
}

type AbiFormInnerProps = Omit<AbiItemFormProps, "abiItem" | "debug"> & {
  item: AbiFunction;
  debug: boolean;
  onCalldataChange?: (calldata: `0x${string}`) => void;
  onValueChange?: (value: bigint) => void;
  onSubmit: () => void;
  submit: boolean;
};

export function AbiItemFormInner({
  item,
  debug,
  onChange: parentOnChange,
  onSubmit,
  defaultCalldata,
  defaultEther,
  submit,
}: AbiFormInnerProps) {
  const [calldata, setCalldata] = useState<`0x${string}` | undefined>(
    defaultCalldata,
  );
  const [values, setValues] = useState(
    decodeDefaultArgs(item, defaultCalldata),
  );
  const [ether, setEther] = useState<bigint | undefined>(defaultEther);

  const onChange = useCallback(
    (newValue: any, i: number) => {
      const newValues = [...values];
      newValues[i] = newValue;
      setValues(newValues);
    },
    [values],
  );

  useEffect(() => {
    try {
      const encoded = encodeFunctionData({
        abi: [item],
        functionName: item.name,
        args: values,
      });
      setCalldata(encoded);
    } catch (e) {
      setCalldata(undefined);
    }
  }, [values, item]);

  useEffect(() => {
    if (!parentOnChange) return;
    parentOnChange({ item: item, data: calldata, value: ether, args: values });
  }, [item, parentOnChange, calldata, ether, values]);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      {item.inputs.map((input, i) => (
        <AbiInput
          key={i}
          name={input.name || i.toString()}
          label={input.name || i.toString()}
          type={input.type}
          debug={debug}
          defaultValue={values[i]}
          onChange={(e) => {
            onChange(e, i);
          }}
        />
      ))}
      {item.stateMutability === "payable" && (
        <AbiInput
          name="value"
          label="value"
          type="uint256"
          debug={debug}
          defaultValue={defaultEther}
          onChange={(e) => {
            try {
              setEther(BigInt(e));
            } catch (e) {
              setEther(undefined);
            }
          }}
        />
      )}
      {submit && (
        <div>
          <Button type="submit" disabled={!calldata}>
            Submit
          </Button>
        </div>
      )}
    </form>
  );
}
