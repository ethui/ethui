import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { invoke } from "@tauri-apps/api";
import { formatAbiParameter, type AbiParameter } from "abitype";
import omit from "lodash-es/omit";

import { Form } from "@ethui/react/components";

export interface ABIInputProps {
  name: string | number;
  label?: string;
  type: AbiParameter | string;
}

export function ABIInput({ name, label, type }: ABIInputProps) {
  const { watch, setValue, setError } = useFormContext();
  const raw = watch(`raw.${name}`);

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
        setValue(`parsed.${name}`, JSON.stringify(parsed));
      } catch (e: unknown) {
        setValue(`parsed.${name}`, null);
        setError(`raw.${name}`, {
          message: e instanceof Error ? e.message.toString() : "Unknown error",
        });
      }
    })();
  }, [raw, setValue, setError, name, humanReadable, type]);

  return (
    <Form.Text
      name={`raw.${name}`}
      label={`${label || name} (${humanReadable})`}
      fullWidth
      size="small"
    />
  );
}
