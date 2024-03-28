import { TextField } from "@mui/material";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { invoke } from "@tauri-apps/api";

export interface ABIInputProps {
  name: string;
  type: string;
}

export function ABIInput({ name, type }: ABIInputProps) {
  const { register, watch, setValue, setError } = useFormContext();
  const raw = watch(`${name}.raw`);
  const parsed = watch(`${name}.parsed`);

  useEffect(() => {
    (async () => {
      try {
        const parsed = await invoke<unknown>("abi_parse_argument", {
          data: JSON.parse(raw),
          type,
        });
        setValue(`${name}.parsed`, JSON.stringify(parsed));
      } catch (e: any) {
        setValue(`${name}.parsed`, null);
        setError(`${name}.raw`, e.toString());
      }
    })();
  }, [raw, setValue, setError, name, type]);

  return (
    <>
      <TextField
        sx={{ minWidth: 300 }}
        size="small"
        label={`${name} (${type})`}
        {...register(`${name}.raw`)}
      />
      parsed: {parsed}
    </>
  );
}
