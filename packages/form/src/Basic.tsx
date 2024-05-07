import { Stack, TextField } from "@mui/material";
import { useCallback, useState } from "react";

import type { InnerProps } from "./AbiInput";

import { parse } from "@ethui/abiparse";
import { Debug, stringify } from "./utils";

export type BasicProps = Omit<InnerProps, "depth" | "type" | "label">;
export function Basic({ name, defaultValue, onChange, debug }: BasicProps) {
  const [value, setValue] = useState(defaultValue);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parse(e.target.value);
    setValue(value);
    onChange(value);
  }, []);

  return (
    <Stack spacing={1}>
      <TextField
        size="small"
        variant="standard"
        name={name}
        onChange={handleChange}
        defaultValue={defaultValue && stringify(defaultValue, 0)}
      />
      {debug && <Debug value={value} />}
    </Stack>
  );
}
