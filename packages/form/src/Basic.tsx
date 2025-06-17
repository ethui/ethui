import { parse } from "@ethui/abiparse";
import { Input } from "@ethui/ui/components/shadcn/input";
import { useCallback, useState } from "react";
import type { InnerProps } from "./AbiInput";
import { Debug, stringify } from "./utils";

export type BasicProps = Omit<InnerProps, "depth" | "type" | "label">;
export function Basic({ name, defaultValue, onChange, debug }: BasicProps) {
  const [value, setValue] = useState(defaultValue);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parse(e.target.value);
      setValue(value);
      onChange(value);
    },
    [onChange],
  );

  return (
    <div>
      <Input
        type="text"
        name={name}
        onChange={handleChange}
        defaultValue={defaultValue && stringify(defaultValue, 0)}
      />
      {debug && <Debug value={value} />}
    </div>
  );
}
