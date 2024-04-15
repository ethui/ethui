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

  const humanReadable: string =
    typeof type === "string" ? type : formatAbiParameter(omit(type, "name"));

  useEffect(() => {
    (async () => {
      let data;
      if (
        type === "string" ||
        (typeof type === "object" && type.type === "string")
      ) {
        data = raw;
      } else if (type === "string" || isNaN(parseInt(raw))) {
        data = JSON.parse(`"${raw}"`);
      } else {
        data = BigInt(raw);
      }

      data = JSON.parse(
        JSON.stringify(data, (_k, v) =>
          ["number", "bigint"].includes(typeof v) ? `0x${v.toString(16)}` : v,
        ),
      );

      try {
        // TODO: replace this with a
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
  }, [raw, setValue, setError, name, humanReadable, type]);

  return (
    <TextField
      sx={{ minWidth: 300 }}
      size="small"
      label={`${name}(${humanReadable})`}
      {...register(`${name}.raw`)}
      fullWidth
    />
  );
}
