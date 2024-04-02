import { TextField } from "@mui/material";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { invoke } from "@tauri-apps/api";
import { formatAbiParameter, type AbiParameter } from "abitype";
import omit from "lodash-es/omit";

export interface ABIInputProps {
  name: string;
  type: AbiParameter | string;
}

export function ABIInput({ name, type }: ABIInputProps) {
  const { register, watch, setValue, setError } = useFormContext();
  const raw = watch(`${name}.raw`);
  const parsed = watch(`${name}.parsed`);

  const humanReadable: string =
    typeof type === "string" ? type : formatAbiParameter(omit(type, "name"));

  useEffect(() => {
    (async () => {
      let data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        data = JSON.parse(`"${raw}"`);
      }

      try {
        const parsed = await invoke<unknown>("abi_parse_argument", {
          data,
          type: humanReadable,
        });
        setValue(`${name}.parsed`, JSON.stringify(parsed));
      } catch (e: any) {
        setValue(`${name}.parsed`, null);
        setError(`${name}.raw`, e.toString());
      }
    })();
  }, [raw, setValue, setError, name, humanReadable]);

  return (
    <>
      <TextField
        sx={{ minWidth: 300 }}
        size="small"
        label={`${name} (${humanReadable})`}
        {...register(`${name}.raw`)}
      />
    </>
  );
}
